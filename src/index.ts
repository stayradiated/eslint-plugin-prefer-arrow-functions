import { DEFAULT_OPTIONS } from './config.js'
import preferArrowFunctions from './prefer-arrow-functions.js'

export default {
  rules: {
    'prefer-arrow-functions': preferArrowFunctions,
  },
  rulesConfig: {
    'prefer-arrow-functions': [2, DEFAULT_OPTIONS],
  },
}
