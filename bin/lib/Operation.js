"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("./Logger");
const Exception_1 = require("./Exception");
// CLASS DEFINITION
// =================================================================================================
class Operation {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config, services, logger) {
        validateConfig(config);
        this.id = config.id;
        this.name = config.name;
        this.origin = config.origin;
        this.timestamp = Date.now();
        this.actions = config.actions;
        this.log = validateLogger(logger);
        if (services) {
            validateServices(services);
            this._dao = services.dao;
            this._cache = services.cache;
            this._notifier = services.notifier;
            this._dispatcher = services.dispatcher;
        }
        this.deferred = [];
        this.state = 1 /* initialized */;
    }
    // PUBLIC PROPERTIES
    // --------------------------------------------------------------------------------------------
    get isSealed() {
        return (this.state === 3 /* sealed */ || this.state === 4 /* closed */);
    }
    get isClosed() {
        return (this.state === 4 /* closed */);
    }
    get dao() {
        if (!this.dao)
            throw new Exception_1.Exception('Cannot use dao service: dao not initialized');
        return this._dao;
    }
    get cache() {
        if (!this.dao)
            throw new Exception_1.Exception('Cannot use cache service: cache not bee initialized');
        return this._cache;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    async notify(noticeOrNotices) {
        if (!noticeOrNotices)
            throw new TypeError('Cannot register notice: notice is undefined');
        if (!this._notifier)
            throw new Error('Cannot register notice: notifier not initialized');
        if (this.isClosed)
            throw new Error('Cannot register notice: operation already closed');
        await this._notifier.send(noticeOrNotices);
    }
    async dispatch(taskOrTasks) {
        if (!taskOrTasks)
            throw new TypeError('Cannot dispatch task: task is undefined');
        if (!this._dispatcher)
            throw new Error('Cannot dispatch task: dispatcher not initialized');
        if (this.isClosed)
            throw new Error('Cannot dispatch task: operation already closed');
        await this._dispatcher.send(taskOrTasks);
    }
    run(action, inputs) {
        return action.call(this, inputs);
    }
    defer(action, inputs) {
        if (!action)
            throw new TypeError('Cannot defer an action: action is undefined');
        if (this.isSealed)
            throw new Error('Cannot defer an action: operation already sealed');
        if (action.merge) {
            for (let i = 0; i < this.deferred.length; i++) {
                if (!this.deferred[i])
                    continue;
                if (this.deferred[i].action === action) {
                    let mergedInputs = action.merge(inputs, this.deferred[i].inputs);
                    if (mergedInputs) {
                        this.deferred[i].inputs = mergedInputs;
                        return;
                    }
                }
            }
        }
        this.deferred.push({ action: action, inputs: inputs });
    }
    // EXECUTOR
    // --------------------------------------------------------------------------------------------
    async execute(inputs) {
        // validate and update the state
        if (this.state === 4 /* closed */)
            throw new Error('Cannot execute operation: operation already closed');
        if (this.state >= 2 /* started */)
            throw new Error('Cannot execute operation: operation already started');
        this.state = 2 /* started */;
        let result = inputs;
        try {
            // execute the actions
            for (let action of this.actions) {
                let start = Date.now();
                this.log.debug(`Executing ${action.name} action`);
                result = await action.call(this, result);
                this.log.debug(`Executed ${action.name} action in ${Date.now() - start} ms`);
            }
            // try to commit changes to the database
            if (this._dao) {
                if (!this._dao.isActive)
                    throw new Error('Dao was closed outside of execution cycle');
                await this._dao.close('commit');
            }
        }
        catch (error) {
            // if the dao is still active, try to roll back
            if (this._dao && this._dao.isActive) {
                await this._dao.close('rollback');
            }
            // mark operation as closed and re-throw the error
            this.state = 4 /* closed */;
            throw error;
        }
        // mark the operation as sealed
        this.state = 3 /* sealed */;
        // execute deferred actions
        await this.executeDeferredActions();
        // mark operation as closed and return the result
        this.state = 4 /* closed */;
        return result;
    }
    // FLUSHING
    // --------------------------------------------------------------------------------------------
    async executeDeferredActions() {
        if (this.deferred.length === 0)
            return Promise.resolve();
        const deferred = this.deferred.filter(NotNull);
        const deferredActionPromises = [];
        const start = Date.now();
        this.log.debug(`Executing ${deferred.length} deferred action(s)`);
        for (let dae of deferred) {
            deferredActionPromises.push(dae.action.call(this, dae.inputs));
        }
        await Promise.all(deferredActionPromises);
        this.log.debug(`Executed ${deferred.length} deferred actions in ${Date.now() - start} ms`);
    }
}
exports.Operation = Operation;
// HELPER FUNCTIONS
// =================================================================================================
function NotNull(element) {
    return (element !== null);
}
function validateConfig(config) {
    if (!config)
        throw new TypeError('Operation config is undefined');
    if (typeof config.id !== 'string' || config.id === '')
        throw new TypeError('Operation ID is missing or invalid');
    if (typeof config.name !== 'string' || config.name === '')
        throw new TypeError('Operation name is missing or invalid');
    if (typeof config.origin !== 'string' || config.origin === '')
        throw new TypeError('Operation origin is missing or invalid');
    if (!Array.isArray(config.actions))
        throw new TypeError('Operation actions are missing or invalid');
    for (let action of config.actions) {
        if (typeof action !== 'function')
            throw new TypeError('Operation action is not a function');
        // TODO: make sure action is not an arrow function
    }
}
function validateLogger(logger) {
    if (!logger)
        return Logger_1.logger;
    if (typeof logger.debug !== 'function')
        throw new TypeError('Logger is invalid');
    if (typeof logger.info !== 'function')
        throw new TypeError('Logger is invalid');
    if (typeof logger.warn !== 'function')
        throw new TypeError('Logger is invalid');
    if (typeof logger.error !== 'function')
        throw new TypeError('Logger is invalid');
    return logger;
}
function validateServices(services) {
    if (services.dao) {
        if (typeof services.dao.close !== 'function')
            throw new TypeError('Dao service is invalid');
    }
    if (services.notifier) {
        if (typeof services.notifier.send !== 'function')
            throw new TypeError('Notifier service is invalid');
    }
    if (services.dispatcher) {
        if (typeof services.dispatcher.send !== 'function')
            throw new TypeError('Dispatcher service is invalid');
    }
}
//# sourceMappingURL=Operation.js.map