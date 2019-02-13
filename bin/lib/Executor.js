"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Operation_1 = require("./Operation");
// MODULE VARIABLES
// ================================================================================================
const CONTINUE_EXECUTION = Symbol();
// CLASS DEFINITION
// ================================================================================================
class Executor {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config) {
        config = processConfig(config);
        this.database = config.database;
        this.cache = config.cache;
        this.dispatcher = config.dispatcher;
        this.notifier = config.notifier;
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    async createContext(config) {
        // TODO: apply defaults?
        const logger = config.logger;
        const daoOptions = undefined; //config.options.dao;
        const services = {
            dao: this.database ? this.database.getClient(daoOptions, logger) : undefined,
            cache: this.cache ? this.cache.getClient(logger) : undefined,
            notifier: this.notifier ? this.notifier.getClient(logger) : undefined,
            dispatcher: this.dispatcher ? this.dispatcher.getClient(logger) : undefined
        };
        return new Operation_1.Operation(config, services);
    }
    async closeContext(context, error) {
        if (error && error[CONTINUE_EXECUTION] !== true) {
            const dao = context.dao;
            if (dao && dao.isActive) {
                await dao.close('rollback');
            }
            return;
        }
        if (!context.isSealed) {
            // TODO: throw error?
        }
        // remove invalidated items from the cache
        if (context.cache) {
            await context.cache.flush();
        }
        // execute deferred actions
        const deferred = context.clearDeferredActions();
        if (deferred.length !== 0) {
            const deferredActionPromises = [];
            context.log.debug(`Executing ${deferred.length} deferred actions`);
            for (let dae of deferred) {
                deferredActionPromises.push(dae.action(dae.inputs, context));
            }
            await Promise.all(deferredActionPromises);
        }
        // send out tasks and notices
        const taskPromise = context.flushTasks();
        const noticePromise = context.flushNotices();
        await Promise.all([taskPromise, noticePromise]);
    }
    async execute(actions, inputs, context) {
        let result = inputs;
        for (let action of actions) {
            context.log.debug(`Executing ${action.name} action`);
            result = await action(result, context);
            context.log.debug(`Executed ${action.name} action`);
        }
        const dao = context.dao;
        if (dao && dao.isActive) {
            await dao.close('commit');
            context.seal();
        }
        // if result is an error, throw it, but signal that execution can continue
        if (result && result instanceof Error) {
            result[CONTINUE_EXECUTION] = true;
            throw result;
        }
        else {
            return result;
        }
    }
}
exports.Executor = Executor;
// HELPER FUNCTIONS
// ================================================================================================
function processConfig(config) {
    // database
    if (!config.database)
        throw new TypeError('Cannot create an Executor: Database is undefined');
    if (typeof config.database.getClient !== 'function')
        throw new TypeError('Cannot create an Executor: Database is invalid');
    // cache
    if (config.cache) {
        if (typeof config.cache.getClient !== 'function')
            throw new TypeError('Cannot create an Executor: Cache factory is invalid');
    }
    // dispatcher
    if (config.dispatcher) {
        if (typeof config.dispatcher.getClient !== 'function')
            throw new TypeError('Cannot create an Executor: Dispatcher factory is invalid');
    }
    // notifier
    if (config.notifier) {
        if (typeof config.notifier.getClient !== 'function')
            throw new TypeError('Cannot create an Executor: Notifier Factory is invalid');
    }
    return config;
}
//# sourceMappingURL=Executor.js.map