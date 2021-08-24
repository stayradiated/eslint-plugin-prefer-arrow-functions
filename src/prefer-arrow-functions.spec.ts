import test from 'ava'
import eslint from 'eslint'

import rule, { Options } from './prefer-arrow-functions.js'

import {
  USE_ARROW_WHEN_FUNCTION,
  USE_ARROW_WHEN_SINGLE_RETURN,
  USE_EXPLICIT,
  USE_IMPLICIT,
} from './config.js'

const { RuleTester } = eslint

type ValidTestCase = eslint.RuleTester.ValidTestCase
type InvalidTestCase = eslint.RuleTester.InvalidTestCase

const alwaysValid: ValidTestCase[] = [
  {
    code: 'var foo = (bar) => bar;',
  },
  {
    code: 'var foo = async (bar) => bar;',
  },
  {
    code: 'var foo = bar => bar;',
  },
  {
    code: 'var foo = async bar => bar;',
  },
  {
    code: 'var foo = bar => { return bar; }',
  },
  {
    code: 'var foo = async bar => { return bar; }',
  },
  {
    code: 'var foo = () => 1;',
  },
  {
    code: 'var foo = async () => 1;',
  },
  {
    code: 'var foo = (bar, fuzz) => bar + fuzz',
  },
  {
    code: 'var foo = async (bar, fuzz) => bar + fuzz',
  },
  {
    code: '["Hello", "World"].reduce((p, a) => p + " " + a);',
  },
  {
    code: '["Hello", "World"].reduce(async (p, a) => p + " " + a);',
  },
  {
    code: 'var foo = (...args) => args',
  },
  {
    code: 'var foo = async (...args) => args',
  },
  {
    code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function() {};',
  },
  {
    code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype = {func: function() {}};',
  },
  {
    code: 'var foo = function() { return this.bar; };',
  },
  {
    code: 'function * testGenerator() { return yield 1; }',
  },
  {
    code: 'const foo = { get bar() { return "test"; } }',
  },
  {
    code: 'const foo = { set bar(xyz) {} }',
  },
  {
    code: 'class foo { get bar() { return "test"; } }',
  },
  {
    code: 'class foo { set bar(xyz) { } }',
  },
  // Arguments is unavailable in arrow functions
  {
    code: 'function bar () {return arguments}',
  },
  {
    code: 'var foo = function () {return arguments}',
  },
  {
    code: 'function bar () {console.log(arguments);}',
  },
  {
    code: 'var foo = function () {console.log(arguments);}',
  },
  // Super() is unavailable in arrow functions
  {
    code: 'class foo extends bar { constructor() {return super()} }',
  },
  {
    code: 'class foo extends bar { constructor() {console.log(super())} }',
  },
  // New.target is unavailable in arrow functions
  {
    code: 'function Foo() {if (!new.target) throw "Foo() must be called with new";}',
  },
]

const validWhenSingleReturnOnly: ValidTestCase[] = [
  {
    code: 'var foo = (bar) => {return bar();}',
  },
  {
    code: 'var foo = async (bar) => {return bar();}',
  },
  {
    code: 'function foo(bar) {bar()}',
  },
  {
    code: 'async function foo(bar) {bar()}',
  },
  {
    code: 'var x = function foo(bar) {bar()}',
  },
  {
    code: 'var x = async function foo(bar) {bar()}',
  },
  {
    code: 'var x = function(bar) {bar()}',
  },
  {
    code: 'var x = async function(bar) {bar()}',
  },
  {
    code: 'function foo(bar) {/* yo */ bar()}',
  },
  {
    code: 'async function foo(bar) {/* yo */ bar()}',
  },
  {
    code: 'function foo() {}',
  },
  {
    code: 'async function foo() {}',
  },
  {
    code: 'function foo(bar) {bar(); return bar()}',
  },
  {
    code: 'async function foo(bar) {bar(); return bar()}',
  },
  {
    code: 'class MyClass { foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'class MyClass { async foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'var MyClass = { foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'var MyClass = { async foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'export default function xyz() { return 3; }',
  },
  {
    code: 'export default async function xyz() { return 3; }',
  },
  {
    code: 'class MyClass { render(a, b) { return 3; } }',
  },
  {
    code: 'class MyClass { async render(a, b) { return 3; } }',
  },
]

const invalidWhenDisallowPrototypeEnabled: InvalidTestCase[] = [
  {
    code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function() {};',
    errors: [USE_ARROW_WHEN_FUNCTION],
  },
]

const invalidAndHasSingleReturn: Array<Omit<InvalidTestCase, 'errors'>> = [
  // With return type
  {
    code: 'function foo(): number { return 3; }',
    output: 'const foo = (): number => 3;',
  },

  // ES6 classes & functions declared in object literals
  {
    code: 'class MyClass { render(a, b) { return 3; } }',
    output: 'class MyClass { render = (a, b) => 3; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'var MyClass = { render(a, b) { return 3; }, b: false }',
    output: 'var MyClass = { render: (a, b) => 3, b: false }',
  },

  // Named function declarations
  {
    code: 'function foo() { return 3; }',
    output: 'const foo = () => 3;',
  },
  {
    code: 'async function foo() { return 3; }',
    output: 'const foo = async () => 3;',
  },
  {
    code: 'function foo(a) { return 3 }',
    output: 'const foo = (a) => 3;',
  },
  {
    code: 'async function foo(a) { return 3 }',
    output: 'const foo = async (a) => 3;',
  },
  {
    code: 'function foo(a) { return 3; }',
    output: 'const foo = (a) => 3;',
  },
  {
    code: 'async function foo(a) { return 3; }',
    output: 'const foo = async (a) => 3;',
  },

  // Eslint treats export default as a special form of function declaration
  {
    code: 'export default function() { return 3; }',
    output: 'export default () => 3;',
  },
  {
    code: 'export default async function() { return 3; }',
    output: 'export default async () => 3;',
  },

  // Sanity check complex logic
  {
    code: 'function foo(a) { return a && (3 + a()) ? true : 99; }',
    output: 'const foo = (a) => a && (3 + a()) ? true : 99;',
  },
  {
    code: 'async function foo(a) { return a && (3 + a()) ? true : 99; }',
    output: 'const foo = async (a) => a && (3 + a()) ? true : 99;',
  },

  // Function expressions
  {
    code: 'var foo = function(bar) { return bar(); }',
    output: 'var foo = (bar) => bar()',
  },
  {
    code: 'var foo = function() { return "World"; }',
    output: 'var foo = () => "World"',
  },
  {
    code: 'var foo = async function() { return "World"; }',
    output: 'var foo = async () => "World"',
  },
  {
    code: 'var foo = function() { return "World"; };',
    output: 'var foo = () => "World";',
  },
  {
    code: 'var foo = async function() { return "World"; };',
    output: 'var foo = async () => "World";',
  },
  {
    code: 'var foo = function x() { return "World"; };',
    output: 'var foo = () => "World";',
  },
  {
    code: 'var foo = async function x() { return "World"; };',
    output: 'var foo = async () => "World";',
  },

  // Wrap object literal returns in parens
  {
    code: 'var foo = function() { return {a: false} }',
    output: 'var foo = () => ({a: false})',
  },
  {
    code: 'var foo = async function() { return {a: false} }',
    output: 'var foo = async () => ({a: false})',
  },
  {
    code: 'var foo = function() { return {a: false}; }',
    output: 'var foo = () => ({a: false})',
  },
  {
    code: 'var foo = async function() { return {a: false}; }',
    output: 'var foo = async () => ({a: false})',
  },
  {
    code: 'function foo(a) { return {a: false}; }',
    output: 'const foo = (a) => ({a: false});',
  },
  {
    code: 'async function foo(a) { return {a: false}; }',
    output: 'const foo = async (a) => ({a: false});',
  },
  {
    code: 'function foo(a) { return {a: false} }',
    output: 'const foo = (a) => ({a: false});',
  },
  {
    code: 'async function foo(a) { return {a: false} }',
    output: 'const foo = async (a) => ({a: false});',
  },

  // Treat inner functions properly
  {
    code: '["Hello", "World"].reduce(function(a, b) { return a + " " + b; })',
    output: '["Hello", "World"].reduce((a, b) => a + " " + b)',
  },
  {
    code: 'var foo = function () { return () => false }',
    output: 'var foo = () => () => false',
  },
  {
    code: 'var foo = async function () { return async () => false }',
    output: 'var foo = async () => async () => false',
  },

  // Don't obliterate whitespace and only remove newlines when appropriate
  {
    code: 'var foo = function() {\n  return "World";\n}',
    output: 'var foo = () => "World"',
  },
  {
    code: 'var foo = async function() {\n  return "World";\n}',
    output: 'var foo = async () => "World"',
  },
  {
    code: 'var foo = function() {\n  return "World"\n}',
    output: 'var foo = () => "World"',
  },
  {
    code: 'var foo = async function() {\n  return "World"\n}',
    output: 'var foo = async () => "World"',
  },
  {
    code: 'function foo(a) {\n  return 3;\n}',
    output: 'const foo = (a) => 3;',
  },
  {
    code: 'async function foo(a) {\n  return 3;\n}',
    output: 'const foo = async (a) => 3;',
  },
  {
    code: 'function foo(a) {\n  return 3\n}',
    output: 'const foo = (a) => 3;',
  },
  {
    code: 'async function foo(a) {\n  return 3\n}',
    output: 'const foo = async (a) => 3;',
  },

  // Don't mess up inner generator functions
  {
    code: 'function foo() { return function * gen() { return yield 1; }; }',
    output: 'const foo = () => function * gen() { return yield 1; };',
  },
  {
    code: 'async function foo() { return function * gen() { return yield 1; }; }',
    output: 'const foo = async () => function * gen() { return yield 1; };',
  },

  // Don't mess with the semicolon in for statements
  {
    code: 'function withLoop() { return () => { for (i = 0; i < 5; i++) {}}}',
    output: 'const withLoop = () => () => { for (i = 0; i < 5; i++) {}};',
  },
  {
    code: 'async function withLoop() { return async () => { for (i = 0; i < 5; i++) {}}}',
    output:
      'const withLoop = async () => async () => { for (i = 0; i < 5; i++) {}};',
  },
  {
    code: 'var withLoop = function() { return () => { for (i = 0; i < 5; i++) {}}}',
    output: 'var withLoop = () => () => { for (i = 0; i < 5; i++) {}}',
  },
  {
    code: 'var withLoop = async function() { return async () => { for (i = 0; i < 5; i++) {}}}',
    output:
      'var withLoop = async () => async () => { for (i = 0; i < 5; i++) {}}',
  },
]

const invalidAndHasSingleReturnWithMultipleMatches: Array<
  Omit<InvalidTestCase, 'errors'>
> = [
  {
    code: 'var foo = function () { return function(a) { a() } }',
    output: 'var foo = () => function(a) { a() }',
  },
  {
    code: 'var foo = async function () { return async function(a) { a() } }',
    output: 'var foo = async () => async function(a) { a() }',
  },
]

const invalidAndHasBlockStatement: Array<Omit<InvalidTestCase, 'errors'>> = [
  // ES6 classes & functions declared in object literals
  {
    code: 'class MyClass { render(a, b) { console.log(3); } }',
    output: 'class MyClass { render = (a, b) => { console.log(3); }; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'var MyClass = { render(a, b) { console.log(3); }, b: false }',
    output: 'var MyClass = { render: (a, b) => { console.log(3); }, b: false }',
  },

  // Named function declarations
  {
    code: 'function foo() { console.log(3); }',
    output: 'const foo = () => { console.log(3); };',
  },
  {
    code: 'async function foo() { console.log(3); }',
    output: 'const foo = async () => { console.log(3); };',
  },
  {
    code: 'function foo(a) { console.log(3); }',
    output: 'const foo = (a) => { console.log(3); };',
  },
  {
    code: 'async function foo(a) { console.log(3); }',
    output: 'const foo = async (a) => { console.log(3); };',
  },
  {
    code: 'function foo(a) { console.log(3); }',
    output: 'const foo = (a) => { console.log(3); };',
  },
  {
    code: 'async function foo(a) { console.log(3); }',
    output: 'const foo = async (a) => { console.log(3); };',
  },

  // Eslint treats export default as a special form of function declaration
  {
    code: 'export default function() { console.log(3); }',
    output: 'export default () => { console.log(3); };',
  },
  {
    code: 'export default async function() { console.log(3); }',
    output: 'export default async () => { console.log(3); };',
  },

  // Sanity check complex logic
  {
    code: 'function foo(a) { console.log(a && (3 + a()) ? true : 99); }',
    output: 'const foo = (a) => { console.log(a && (3 + a()) ? true : 99); };',
  },
  {
    code: 'async function foo(a) { console.log(a && (3 + a()) ? true : 99); }',
    output:
      'const foo = async (a) => { console.log(a && (3 + a()) ? true : 99); };',
  },

  // Function expressions
  {
    code: 'var foo = function() { console.log("World"); }',
    output: 'var foo = () => { console.log("World"); }',
  },
  {
    code: 'var foo = async function() { console.log("World"); }',
    output: 'var foo = async () => { console.log("World"); }',
  },
  {
    code: 'var foo = function() { console.log("World"); };',
    output: 'var foo = () => { console.log("World"); };',
  },
  {
    code: 'var foo = async function() { console.log("World"); };',
    output: 'var foo = async () => { console.log("World"); };',
  },
  {
    code: 'var foo = function x() { console.log("World"); };',
    output: 'var foo = () => { console.log("World"); };',
  },
  {
    code: 'var foo = async function x() { console.log("World"); };',
    output: 'var foo = async () => { console.log("World"); };',
  },

  // Wrap object literal console.log(in parens
  {
    code: 'var foo = function() { console.log({a: false}); }',
    output: 'var foo = () => { console.log({a: false}); }',
  },
  {
    code: 'var foo = async function() { console.log({a: false}); }',
    output: 'var foo = async () => { console.log({a: false}); }',
  },
  {
    code: 'var foo = function() { console.log({a: false}); }',
    output: 'var foo = () => { console.log({a: false}); }',
  },
  {
    code: 'var foo = async function() { console.log({a: false}); }',
    output: 'var foo = async () => { console.log({a: false}); }',
  },
  {
    code: 'function foo(a) { console.log({a: false}); }',
    output: 'const foo = (a) => { console.log({a: false}); };',
  },
  {
    code: 'async function foo(a) { console.log({a: false}); }',
    output: 'const foo = async (a) => { console.log({a: false}); };',
  },
  {
    code: 'function foo(a) { console.log({a: false}); }',
    output: 'const foo = (a) => { console.log({a: false}); };',
  },
  {
    code: 'async function foo(a) { console.log({a: false}); }',
    output: 'const foo = async (a) => { console.log({a: false}); };',
  },

  // Don't obliterate whitespace and only remove newlines when appropriate
  {
    code: 'var foo = function() {\n  console.log("World");\n}',
    output: 'var foo = () => {\n  console.log("World");\n}',
  },
  {
    code: 'var foo = async function() {\n  console.log("World");\n}',
    output: 'var foo = async () => {\n  console.log("World");\n}',
  },
  {
    code: 'var foo = function() {\n  console.log("World");\n}',
    output: 'var foo = () => {\n  console.log("World");\n}',
  },
  {
    code: 'var foo = async function() {\n  console.log("World");\n}',
    output: 'var foo = async () => {\n  console.log("World");\n}',
  },
  {
    code: 'function foo(a) {\n  console.log(3);\n}',
    output: 'const foo = (a) => {\n  console.log(3);\n};',
  },
  {
    code: 'async function foo(a) {\n  console.log(3);\n}',
    output: 'const foo = async (a) => {\n  console.log(3);\n};',
  },
  {
    code: 'function foo(a) {\n  console.log(3);\n}',
    output: 'const foo = (a) => {\n  console.log(3);\n};',
  },
  {
    code: 'async function foo(a) {\n  console.log(3);\n}',
    output: 'const foo = async (a) => {\n  console.log(3);\n};',
  },

  // Don't mess with the semicolon in for statements
  {
    code: 'function withLoop() { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
    output:
      'const withLoop = () => { console.log(() => { for (i = 0; i < 5; i++) {}}) };',
  },
  {
    code: 'async function withLoop() { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
    output:
      'const withLoop = async () => { console.log(async () => { for (i = 0; i < 5; i++) {}}) };',
  },
  {
    code: 'var withLoop = function() { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
    output:
      'var withLoop = () => { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
  },
  {
    code: 'var withLoop = async function() { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
    output:
      'var withLoop = async () => { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
  },
]

const invalidAndHasBlockStatementWithMultipleMatches: Array<
  Omit<InvalidTestCase, 'errors'>
> = [
  // Treat inner functions properly
  {
    code: '["Hello", "World"].forEach(function(a, b) { console.log(a + " " + b); })',
    output:
      '["Hello", "World"].forEach((a, b) => { console.log(a + " " + b); })',
  },
  {
    code: 'var foo = function () { console.log(() => false); }',
    output: 'var foo = () => { console.log(() => false); }',
  },
  {
    code: 'var foo = async function () { console.log(async () => false) }',
    output: 'var foo = async () => { console.log(async () => false) }',
  },

  // Don't mess up inner generator functions
  {
    code: 'function foo() { console.log(function * gen() { yield 1; }); }',
    output:
      'const foo = () => { console.log(function * gen() { yield 1; }); };',
  },
  {
    code: 'async function foo() { console.log(function * gen() { yield 1; }); }',
    output:
      'const foo = async () => { console.log(function * gen() { yield 1; }); };',
  },
]

const invalidWhenReturnStyleIsImplicit: Array<Omit<InvalidTestCase, 'errors'>> =
  [
    {
      code: 'var foo = bar => { return bar(); }',
      output: 'var foo = (bar) => bar()',
    },
    {
      code: 'var foo = async bar => { return bar(); }',
      output: 'var foo = async (bar) => bar()',
    },
  ]

const invalidWhenReturnStyleIsExplicit: Array<Omit<InvalidTestCase, 'errors'>> =
  [
    {
      code: 'var foo = (bar) => bar()',
      output: 'var foo = (bar) => { return bar() }',
    },
    {
      code: 'var foo = async (bar) => bar()',
      output: 'var foo = async (bar) => { return bar() }',
    },
  ]

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
})

const withOptions =
  (extraOptions: Options) =>
  <T extends ValidTestCase>(object: T): T => ({
    ...object,
    options: [
      { ...(object.options ? object.options[0] : {}), ...extraOptions },
    ],
  })

const withErrors =
  (errors: string[]) =>
  (object: Omit<InvalidTestCase, 'errors'>): InvalidTestCase => ({
    ...object,
    errors,
  })

test(`
  when function is valid, or cannot be converted to an arrow function
  it considers the function valid
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: alwaysValid,
    invalid: [],
  })
  t.pass()
})

test(`
  when singleReturnOnly is true
  when function should be an arrow function
  when function does not contain only a return statement
    it considers the function valid
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [
      ...invalidAndHasBlockStatement,
      ...invalidAndHasBlockStatementWithMultipleMatches,
      ...validWhenSingleReturnOnly,
    ].map(withOptions({ singleReturnOnly: true })),
    invalid: [],
  })
  t.pass()
})

test(`
  when singleReturnOnly is true
  when function should be an arrow function
  when function contains only a return statement
    it fixes the function
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidAndHasSingleReturn
      .map(withOptions({ singleReturnOnly: true }))
      .map(withErrors([USE_ARROW_WHEN_SINGLE_RETURN])),
  })
  t.pass()
})

test(`
  when singleReturnOnly is true
  when two functions are featured: one returns immediately and the other has a block statement
    it fixes the function which returns and considers the other valid
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidAndHasSingleReturnWithMultipleMatches
      .map(withOptions({ singleReturnOnly: true }))
      .map(withErrors([USE_ARROW_WHEN_SINGLE_RETURN])),
  })
  t.pass()
})

test(`
  when singleReturnOnly is false
  when function should be an arrow function
    it fixes the function
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      ...invalidAndHasSingleReturn,
      ...invalidAndHasBlockStatement,
      ...invalidAndHasBlockStatementWithMultipleMatches,
    ]
      .map(withOptions({ singleReturnOnly: false }))
      .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
  })
  t.pass()
})

test(`
  when singleReturnOnly is false
  when function should be an arrow function
  when function has a block statement
  when returnStyle is "explicit"
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidAndHasBlockStatement
      .map(withOptions({ returnStyle: 'explicit', singleReturnOnly: false }))
      .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
  })
  t.pass()
})

test(`
  when singleReturnOnly is false
  when function should be an arrow function
  when function has a block statement
  when returnStyle is "implicit"
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidAndHasBlockStatement
      .map(withOptions({ returnStyle: 'implicit', singleReturnOnly: false }))
      .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
  })
  t.pass()
})

test(`
  when singleReturnOnly is false
  when function should be an arrow function
  when function has a block statement
  when returnStyle is "unchanged" or not set
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidAndHasBlockStatement
      .map(withOptions({ returnStyle: 'unchanged', singleReturnOnly: false }))
      .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
  })
  t.pass()
})

test(`
  when singleReturnOnly is false
  when function should be an arrow function
  when two functions are featured: one returns immediately and the other has a block statement
    it fixes both functions
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidAndHasSingleReturnWithMultipleMatches
      .map(withOptions({ singleReturnOnly: false }))
      .map(withErrors([USE_ARROW_WHEN_FUNCTION, USE_ARROW_WHEN_FUNCTION])),
  })
  t.pass()
})

test(`
  when disallowPrototype is true
  when function should be an arrow function
  when function is assigned to a prototype
    it considers the function invalid
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidWhenDisallowPrototypeEnabled.map(
      withOptions({ disallowPrototype: true }),
    ),
  })
  t.pass()
})

test(`
  when returnStyle is "implicit"
  when function is an arrow function with a block statement containing an immediate return
    it fixes the function to have an implicit return
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidWhenReturnStyleIsImplicit
      .map(withOptions({ returnStyle: 'implicit' }))
      .map(withErrors([USE_IMPLICIT])),
  })
  t.pass()
})

test(`
  when returnStyle is "explicit"
  when function is an arrow function with an implicit return
    it fixes the function to have a block statement containing an immediate return
`, (t) => {
  ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
    valid: [],
    invalid: invalidWhenReturnStyleIsExplicit
      .map(withOptions({ returnStyle: 'explicit' }))
      .map(withErrors([USE_EXPLICIT])),
  })
  t.pass()
})
