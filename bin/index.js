"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Operation_1 = require("./lib/Operation");
const commonActions = require("./lib/actions");
// MODULE FUNCTIONS
// =================================================================================================
function create(config, services, logger) {
    return new Operation_1.Operation(config, services, logger);
}
exports.create = create;
async function execute(operation, actions, inputs) {
    const op = operation;
    if (typeof op.execute !== 'function')
        throw new TypeError('Operation executor could not be found');
    return op.execute(actions, inputs);
}
exports.execute = execute;
// RE-EXPORTS
// =================================================================================================
exports.actions = commonActions;
//# sourceMappingURL=index.js.map