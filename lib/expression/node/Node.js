/**
 * Node
 */
function Node() {}

/**
 * Evaluate the node
 * @return {*} result
 */
Node.prototype.eval = function () {
  throw new Error('Cannot evaluate a Node interface');
};

/**
 * Compile the node to javascript code
 * @param {Object} math       math.js instance
 * @return {Function} expr    Returns an object with a function 'eval',
 *                            which can be invoked as expr.eval(scope),
 *                            where scope is an object with variables.
 */
Node.prototype.compile = function (math) {
  if (typeof math !== 'object') {
    throw new TypeError('Object expected as parameter math');
  }

  // definitions globally available inside the closure of the compiled expressions
  var defs = {
    math: math
  };

  var code = this._compile(defs);

  var defsCode = Object.keys(defs).map(function (name) {
    return '    var ' + name + ' = defs["' + name + '"];';
  });

  var factoryCode =
      defsCode.join(' ') +
      'return {' +
      '  "eval": function (scope) {' +
      '    scope = scope || {};' +
      '    return ' + code + ';' +
      '  }' +
      '};';

  var factory = new Function ('defs', factoryCode);
  return factory(defs);
};

/**
 * Compile the node to javascript code
 * @param {Object} defs     Object which can be used to define functions
 *                          and constants globally available inside the closure
 *                          of the compiled expression
 * @return {String} js
 * @private
 */
Node.prototype._compile = function (defs) {
  throw new Error('Cannot compile a Node interface');
};

/**
 * Find any node in the node tree matching given filter. For example, to
 * find all nodes of type SymbolNode having name 'x':
 *
 *     var results = Node.find({
 *         type: SymbolNode,
 *         properties: {
 *             name: 'x'
 *         }
 *     });
 *
 * @param {Object} filter       Available parameters:
 *                                  {Function} type
 *                                  {Object<String, String>} properties
 * @return {Node[]} nodes       An array with nodes matching given filter criteria
 */
Node.prototype.find = function (filter) {
  return this.match(filter) ? [this] : [];
};

/**
 * Test if this object matches given filter
 * @param {Object} filter       Available parameters:
 *                              {Function} type
 *                              {Object<String, String>} properties
 * @return {Boolean} matches    True if there is a match
 */
Node.prototype.match = function (filter) {
  var match = true;

  if (filter) {
    if (filter.type && !(this instanceof filter.type)) {
      match = false;
    }
    if (match && filter.properties) {
      for (var prop in filter.properties) {
        if (filter.properties.hasOwnProperty(prop)) {
          if (this[prop] != filter.properties[prop]) {
            match = false;
            break;
          }
        }
      }
    }
  }

  return match;
};

/**
 * Get string representation
 * @return {String}
 */
Node.prototype.toString = function() {
  return '';
};

module.exports = Node;