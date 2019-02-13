// IMPORTS
// ================================================================================================
import { 
    Executor as IExecutor, ExecutorConfig, OperationOptions, OperationConfig, Action,
    Database, CacheFactory, DispatcherFactory, NotifierFactory
} from '@nova/core';
import { Operation } from './Operation';

// MODULE VARIABLES
// ================================================================================================
const CONTINUE_EXECUTION = Symbol();

// CLASS DEFINITION
// ================================================================================================
export class Executor implements IExecutor {

    readonly database?      : Database;
    readonly cache?         : CacheFactory;
    readonly dispatcher?    : DispatcherFactory;
    readonly notifier?      : NotifierFactory;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config: ExecutorConfig) {

        config = processConfig(config);

        this.database       = config.database;
        this.cache          = config.cache;
        this.dispatcher     = config.dispatcher;
        this.notifier       = config.notifier;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    async createContext(config: OperationConfig): Promise<Operation> {

        // TODO: apply defaults?
        const logger = config.logger;
        const daoOptions = undefined; //TODO: config.options.dao;

        const services = {
            dao         : this.database ? this.database.getClient(daoOptions, logger) : undefined,
            cache       : this.cache ? this.cache.getClient(logger) : undefined,
            notifier    : this.notifier ? this.notifier.getClient(logger) : undefined,
            dispatcher  : this.dispatcher ? this.dispatcher.getClient(logger) : undefined
        };

        return new Operation(config, services);
    }

    async closeContext(context: Operation, error?: Error): Promise<void> {

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
            const deferredActionPromises: Promise<any>[] = [];
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

    async execute(actions: Action<any,any>[], inputs: any, context: Operation): Promise<any> {
        
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

// HELPER FUNCTIONS
// ================================================================================================
function processConfig(config: ExecutorConfig) {
 
    // database
    if (!config.database) throw new TypeError('Cannot create an Executor: Database is undefined');
    if (typeof config.database.getClient !== 'function') throw new TypeError('Cannot create an Executor: Database is invalid');

    // cache
    if (config.cache) {
        if (typeof config.cache.getClient !== 'function') throw new TypeError('Cannot create an Executor: Cache factory is invalid');
    }

    // dispatcher
    if (config.dispatcher) {
        if (typeof config.dispatcher.getClient !== 'function') throw new TypeError('Cannot create an Executor: Dispatcher factory is invalid');        
    }

    // notifier
    if (config.notifier) {
        if (typeof config.notifier.getClient !== 'function') throw new TypeError('Cannot create an Executor: Notifier Factory is invalid');
    }

    return config;
}