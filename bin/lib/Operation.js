"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
            this.dao = services.dao;
            this.cache = services.cache;
            this.notifier = services.notifier;
            this.dispatcher = services.dispatcher;
        }
        this.tasks = [];
        this.notices = new Map();
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
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    notify(target, notice, immediate = false) {
        if (!notice)
            throw new TypeError('Cannot register notice: notice is undefined');
        if (!this.notifier)
            throw new Error('Cannot register notice: notifier not initialized');
        if (this.isClosed)
            throw new Error('Cannot register notice: operation already closed');
        if (immediate) {
            this.notifier.send(target, notice);
            return;
        }
        const notices = this.notices.get(target) || [];
        for (let i = 0; i < notices.length; i++) {
            if (!notice[i])
                continue;
            let merged = notice.merge(notices[i]);
            if (merged) {
                notices[i] = null;
                notice = merged;
            }
        }
        notices.push(notice);
        this.notices.set(target, notices);
    }
    dispatch(task, immediate = false) {
        if (!task)
            throw new TypeError('Cannot dispatch task: task is undefined');
        if (!this.dispatcher)
            throw new Error('Cannot dispatch task: dispatcher not initialized');
        if (this.isClosed)
            throw new Error('Cannot dispatch task: operation already closed');
        if (immediate) {
            this.dispatcher.send(task);
            return;
        }
        for (let i = 0; i < this.tasks.length; i++) {
            if (!this.tasks[i])
                continue;
            let merged = task.merge(this.tasks[i]);
            if (merged) {
                this.tasks[i] = null;
                task = merged;
            }
        }
        this.tasks.push(task);
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
            if (this.dao) {
                if (!this.dao.isActive)
                    throw new Error('Dao was closed outside of execution cycle');
                await this.dao.close('commit');
            }
        }
        catch (error) {
            // if the dao is still active, try to roll back
            if (this.dao && this.dao.isActive) {
                await this.dao.close('rollback');
            }
            // mark operation as closed and re-throw the error
            this.state = 4 /* closed */;
            throw error;
        }
        // mark the operation as sealed
        this.state = 3 /* sealed */;
        // execute deferred actions
        await this.executeDeferredActions();
        // send out tasks and notices
        const taskPromise = this.flushTasks();
        const noticePromise = this.flushNotices();
        await Promise.all([taskPromise, noticePromise]);
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
    flushNotices() {
        if (!this.notifier || this.notices.size === 0)
            return Promise.resolve();
        let promises = [];
        for (let [target, notices] of this.notices) {
            promises.push(this.notifier.send(target, notices.filter(NotNull)));
        }
        this.notices.clear();
        return Promise.all(promises);
    }
    flushTasks() {
        if (!this.dispatcher || this.tasks.length === 0)
            return Promise.resolve();
        const tasks = this.tasks.filter(NotNull);
        const promise = this.dispatcher.send(tasks);
        this.tasks.length = 0;
        return promise;
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
        return console;
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