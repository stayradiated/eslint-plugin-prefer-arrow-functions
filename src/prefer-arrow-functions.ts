import type { Rule } from 'eslint'
import type {
  Node,
  BaseFunction,
  ReturnStatement,
  FunctionDeclaration,
  FunctionExpression,
  Property,
  Identifier,
  MemberExpression,
} from 'estree'

import {
  DEFAULT_OPTIONS,
  USE_ARROW_WHEN_FUNCTION,
  USE_ARROW_WHEN_SINGLE_RETURN,
  USE_EXPLICIT,
  USE_IMPLICIT,
} from './config.js'

type Options = {
  singleReturnOnly?: boolean
  disallowPrototype?: boolean
  returnStyle?: 'unchanged' | 'explicit' | 'implicit'
  classPropertiesAllowed?: boolean
}

type FunctionNode = (FunctionDeclaration | FunctionExpression) &
  Rule.NodeParentExtension

type BlockStatementWithSingleReturn = FunctionDeclaration &
  Rule.NodeParentExtension & {
    body: {
      body: [ReturnStatement]
    }
  }

const rule: Rule.RuleModule = {
  meta: {
    docs: {
      category: 'emcascript6',
      description: 'prefer arrow functions',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          classPropertiesAllowed: { type: 'boolean' },
          disallowPrototype: { type: 'boolean' },
          returnStyle: {
            default: DEFAULT_OPTIONS.returnStyle,
            pattern: '^(explicit|implicit|unchanged)$',
            type: 'string',
          },
          singleReturnOnly: { type: 'boolean' },
        },
        type: 'object',
      },
    ],
  },
  create: (context: Rule.RuleContext) => {
    const options = context.options[0] || {}

    const getOption = (name: keyof typeof DEFAULT_OPTIONS) =>
      typeof options[name] !== 'undefined'
        ? options[name]
        : DEFAULT_OPTIONS[name]

    const singleReturnOnly = getOption('singleReturnOnly')
    const classPropertiesAllowed = getOption('classPropertiesAllowed')
    const disallowPrototype = getOption('disallowPrototype')
    const returnStyle = getOption('returnStyle')

    const sourceCode = context.getSourceCode()

    const isBlockStatementWithSingleReturn = (
      node: FunctionNode,
    ): node is BlockStatementWithSingleReturn =>
      node.body.body &&
      node.body.body.length === 1 &&
      node.body.body[0]?.type === 'ReturnStatement'

    const isImplicitReturn = (node: FunctionNode) =>
      node.body && !node.body.body

    const returnsImmediately = (node: FunctionNode) =>
      isBlockStatementWithSingleReturn(node) || isImplicitReturn(node)

    const getBodySource = (node: FunctionNode) => {
      if (
        isBlockStatementWithSingleReturn(node) &&
        returnStyle !== 'explicit'
      ) {
        const returnValue = node.body.body[0].argument!
        const source = sourceCode.getText(returnValue)
        return returnValue.type === 'ObjectExpression' ? `(${source})` : source
      }

      if (isImplicitReturn(node) && returnStyle !== 'implicit') {
        return `{ return ${sourceCode.getText(node.body)} }`
      }

      return sourceCode.getText(node.body)
    }

    const getParametersSource = (parameters: FunctionDeclaration['params']) =>
      parameters.map((parameter) => sourceCode.getText(parameter))

    const getReturnType = (node: any) =>
      node.type === 'FunctionDeclaration' && node.returnType
        ? sourceCode.getText(node.returnType)
        : ''

    const getFunctionName = (node: FunctionNode) =>
      node && node.id && node.id.name ? node.id.name : ''

    const isAsyncFunction = (node: BaseFunction) => node.async === true

    const isGeneratorFunction = (node: BaseFunction) => node.generator === true

    const containsToken = (type: string, value: string, node: Node) =>
      sourceCode
        .getTokens(node)
        .some((token) => token.type === type && token.value === value)

    const containsSuper = (node: Node) =>
      containsToken('Keyword', 'super', node)

    const containsThis = (node: Node) => containsToken('Keyword', 'this', node)

    const containsArguments = (node: Node) =>
      containsToken('Identifier', 'arguments', node)

    const containsTokenSequence = (
      sequence: Array<[string, string]>,
      node: Node,
    ) =>
      sourceCode.getTokens(node).some((_, tokenIndex, tokens) =>
        sequence.every(([expectedType, expectedValue], i) => {
          const actual = tokens[tokenIndex + i]
          return (
            actual &&
            actual.type === expectedType &&
            actual.value === expectedValue
          )
        }),
      )

    const containsNewDotTarget = (node: FunctionNode) =>
      containsTokenSequence(
        [
          ['Keyword', 'new'],
          ['Punctuator', '.'],
          ['Identifier', 'target'],
        ],
        node,
      )

    const writeArrowFunction = (node: FunctionNode) => {
      const { body, isAsync, params, returnType } = getFunctionDescriptor(node)
      return 'ASYNC(PARAMS)RETURN_TYPE => BODY'
        .replace('ASYNC', isAsync ? 'async ' : '')
        .replace('RETURN_TYPE', returnType)
        .replace('BODY', body)
        .replace('PARAMS', params.join(', '))
    }

    const writeArrowConstant = (node: FunctionNode) => {
      const { name } = getFunctionDescriptor(node)
      return 'const NAME = ARROW_FUNCTION'
        .replace('NAME', name)
        .replace('ARROW_FUNCTION', writeArrowFunction(node))
    }

    const getFunctionDescriptor = (node: FunctionNode) => ({
      body: getBodySource(node),
      isAsync: isAsyncFunction(node),
      isGenerator: isGeneratorFunction(node),
      name: getFunctionName(node),
      params: getParametersSource(node.params),
      returnType: getReturnType(node),
    })

    const isPrototypeAssignment = () =>
      context
        .getAncestors()
        .reverse()
        .some((ancestor) => {
          const isPropertyOfReplacementPrototypeObject =
            ancestor.type === 'AssignmentExpression' &&
            ((ancestor.left as MemberExpression)?.property as Identifier)
              ?.name === 'prototype'
          const isMutationOfExistingPrototypeObject =
            ancestor.type === 'AssignmentExpression' &&
            (
              ((ancestor.left as MemberExpression)?.object as MemberExpression)
                ?.property as Identifier
            )?.name === 'prototype'
          return (
            isPropertyOfReplacementPrototypeObject ||
            isMutationOfExistingPrototypeObject
          )
        })

    const isWithinClassBody = () =>
      context
        .getAncestors()
        .reverse()
        .some((ancestor) => ancestor.type === 'ClassBody')

    const isNamedDefaultExport = (node: FunctionNode) =>
      node.id?.name && node.parent.type === 'ExportDefaultDeclaration'

    const isSafeTransformation = (node: FunctionNode) =>
      !isGeneratorFunction(node) &&
      !containsThis(node) &&
      !containsSuper(node) &&
      !containsArguments(node) &&
      !containsNewDotTarget(node) &&
      (disallowPrototype || !isPrototypeAssignment()) &&
      (!singleReturnOnly ||
        (returnsImmediately(node) && !isNamedDefaultExport(node)))

    const getMessage = (node: FunctionNode) =>
      singleReturnOnly && returnsImmediately(node)
        ? USE_ARROW_WHEN_SINGLE_RETURN
        : USE_ARROW_WHEN_FUNCTION

    return {
      'ExportDefaultDeclaration > FunctionDeclaration': (
        node: FunctionNode,
      ) => {
        if (isSafeTransformation(node)) {
          context.report({
            fix: (fixer) =>
              fixer.replaceText(node, writeArrowFunction(node) + ';'),
            message: getMessage(node),
            node,
          })
        }
      },
      ':matches(ClassProperty, MethodDefinition, Property)[key.name][value.type="FunctionExpression"][kind!=/^(get|set)$/]':
        (node: Property) => {
          const propName = (node.key as Identifier).name
          const functionNode = node.value as FunctionNode
          if (
            isSafeTransformation(functionNode) &&
            (!isWithinClassBody() || classPropertiesAllowed)
          ) {
            context.report({
              fix: (fixer) =>
                fixer.replaceText(
                  node,
                  isWithinClassBody()
                    ? `${propName} = ${writeArrowFunction(functionNode)};`
                    : `${propName}: ${writeArrowFunction(functionNode)}`,
                ),
              message: getMessage(functionNode),
              node: functionNode,
            })
          }
        },
      'ArrowFunctionExpression[body.type!="BlockStatement"]': (
        node: FunctionNode,
      ) => {
        if (returnStyle === 'explicit' && isSafeTransformation(node)) {
          context.report({
            fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node)),
            message: USE_EXPLICIT,
            node,
          })
        }
      },
      'ArrowFunctionExpression[body.body.length=1][body.body.0.type="ReturnStatement"]':
        (node: FunctionNode) => {
          if (returnStyle === 'implicit' && isSafeTransformation(node)) {
            context.report({
              fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node)),
              message: USE_IMPLICIT,
              node,
            })
          }
        },
      'FunctionExpression[parent.type!=/^(ClassProperty|MethodDefinition|Property)$/]':
        (node: FunctionNode) => {
          if (isSafeTransformation(node)) {
            context.report({
              fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node)),
              message: getMessage(node),
              node,
            })
          }
        },
      'FunctionDeclaration[parent.type!="ExportDefaultDeclaration"]': (
        node: FunctionNode,
      ) => {
        if (isSafeTransformation(node)) {
          context.report({
            fix: (fixer) =>
              fixer.replaceText(node, writeArrowConstant(node) + ';'),
            message: getMessage(node),
            node,
          })
        }
      },
    }
  },
}

export default rule
export type { Options }
