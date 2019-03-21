// IMPORTS
// =================================================================================================
import {
    Context, Executable, OperationConfig, OperationServices, Logger, Dao, Cache, Notifier, Dispatcher, Action, Notice, Task
} from '@nova/core';
import { logger as consoleLogger } from './Logger';
import { Exception } from './Exception';

// INTERFACES
// =================================================================================================
interface ActionEnvelope<V=any,T=any> {
    action: Action<V,T>;
    inputs: V;
}

const enum OperationState {
    initialized = 1, started = 2, sealed = 3, closed = 4
}

// CLASS DEFINITION
// =================================================================================================
export class Operation implements Context, Executable {

    readonly id                     : string;
    readonly name                   : string;
    readonly origin                 : string;
    readonly timestamp              : number;

    readonly log                    : Logger;

    private state                   : OperationState;
    private readonly actions        : Action[];
    private readonly deferred       : ActionEnvelope[];

    private readonly _dao?          : Dao;
    private readonly _cache?        : Cache;
    private readonly _notifier?     : Notifier;
    private readonly _dispatcher?   : Dispatcher;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config: OperationConfig, services?: OperationServices, logger?: Logger) {

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
        this.state = OperationState.initialized;
    }

    // PUBLIC PROPERTIES
    // --------------------------------------------------------------------------------------------
    get isSealed(): boolean {
        return (this.state === OperationState.sealed || this.state === OperationState.closed);
    }

    get isClosed(): boolean {
        return (this.state === OperationState.closed);
    }

    get dao(): Dao {
        if (!this.dao) throw new Exception('Cannot use dao service: dao not initialized');
        return this._dao;
    }

    get cache(): Cache {
        if (!this.dao) throw new Exception('Cannot use cache service: cache not bee initialized');
        return this._cache;
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    async notify(noticeOrNotices: Notice | Notice[]) {
        if (!noticeOrNotices) throw new TypeError('Cannot register notice: notice is undefined');
        if (!this._notifier) throw new Error('Cannot register notice: notifier not initialized');
        if (this.isClosed) throw new Error('Cannot register notice: operation already closed');

        await this._notifier.send(noticeOrNotices);
    }

    async dispatch(taskOrTasks: Task | Task[]) {
        if (!taskOrTasks) throw new TypeError('Cannot dispatch task: task is undefined');
        if (!this._dispatcher) throw new Error('Cannot dispatch task: dispatcher not initialized');
        if (this.isClosed) throw new Error('Cannot dispatch task: operation already closed');

        await this._dispatcher.send(taskOrTasks);
    }

    run<V,T>(action: Action<V,T>, inputs: V): Promise<T> {
        return action.call(this, inputs);
    }

    defer<V,T>(action: Action<V,T>, inputs: V): void {
        if (!action) throw new TypeError('Cannot defer an action: action is undefined');
        if (this.isSealed) throw new Error('Cannot defer an action: operation already sealed');

        if (action.merge) {
            for (let i = 0; i < this.deferred.length; i++) {
                if (!this.deferred[i]) continue;
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
    async execute(inputs: any): Promise<any> {

        // validate and update the state
        if (this.state === OperationState.closed) throw new Error('Cannot execute operation: operation already closed');
        if (this.state >= OperationState.started) throw new Error('Cannot execute operation: operation already started');
        this.state = OperationState.started;

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
                if (!this._dao.isActive) throw new Error('Dao was closed outside of execution cycle');
                await this._dao.close('commit');
            }
        }
        catch (error) {
            // if the dao is still active, try to roll back
            if (this._dao && this._dao.isActive) {
                await this._dao.close('rollback');
            }

            // mark operation as closed and re-throw the error
            this.state = OperationState.closed;
            throw error;
        }

        // mark the operation as sealed
        this.state = OperationState.sealed;

        // execute deferred actions
        await this.executeDeferredActions();

        // mark operation as closed and return the result
        this.state = OperationState.closed;
        return result;
    }

    // FLUSHING
    // --------------------------------------------------------------------------------------------
    private async executeDeferredActions() {
        if (this.deferred.length === 0) return Promise.resolve();
        const deferred = this.deferred.filter(NotNull);
        const deferredActionPromises: Promise<any>[] = [];

        const start = Date.now();
        this.log.debug(`Executing ${deferred.length} deferred action(s)`);
        for (let dae of deferred) {
            deferredActionPromises.push(dae.action.call(this, dae.inputs));
        }
        await Promise.all(deferredActionPromises);
        this.log.debug(`Executed ${deferred.length} deferred actions in ${Date.now()-start} ms`);
    }
}

// HELPER FUNCTIONS
// =================================================================================================
function NotNull(element: any): boolean {
    return (element !== null);
}

function validateConfig(config: OperationConfig) {
    if (!config) throw new TypeError('Operation config is undefined');

    if (typeof config.id !== 'string' || config.id === '') throw new TypeError('Operation ID is missing or invalid');
    if (typeof config.name !== 'string' || config.name === '') throw new TypeError('Operation name is missing or invalid');
    if (typeof config.origin !== 'string' || config.origin === '') throw new TypeError('Operation origin is missing or invalid');

    if (!Array.isArray(config.actions)) throw new TypeError('Operation actions are missing or invalid');
    for (let action of config.actions) {
        if (typeof action !== 'function') throw new TypeError('Operation action is not a function');
        // TODO: make sure action is not an arrow function
    }
}

function validateLogger(logger?: Logger): Logger {
    if (!logger) return consoleLogger;

    if (typeof logger.debug !== 'function') throw new TypeError('Logger is invalid');
    if (typeof logger.info !== 'function') throw new TypeError('Logger is invalid');
    if (typeof logger.warn !== 'function') throw new TypeError('Logger is invalid');
    if (typeof logger.error !== 'function') throw new TypeError('Logger is invalid');
    return logger;
}

function validateServices(services: OperationServices) {
    if (services.dao) {
        if (typeof services.dao.close !== 'function') throw new TypeError('Dao service is invalid');
    }

    if (services.notifier) {
        if (typeof services.notifier.send !== 'function') throw new TypeError('Notifier service is invalid');
    }

    if (services.dispatcher) {
        if (typeof services.dispatcher.send !== 'function') throw new TypeError('Dispatcher service is invalid');
    }
}
