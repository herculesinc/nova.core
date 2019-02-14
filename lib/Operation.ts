// IMPORTS
// =================================================================================================
import {
    Operation as IOperation, OperationConfig, OperationServices, 
    Logger, Dao, Cache, Notifier, Dispatcher, Action, Notice, Task
} from '@nova/core';

// INTERFACES
// =================================================================================================
interface ActionEnvelope<V,T> {
    action: Action<V,T>;
    inputs: V;
}

const enum OperationState {
    initialized = 1, started = 2, sealed = 3, closed = 4
}

// CLASS DEFINITION
// =================================================================================================
export class Operation implements IOperation {

    readonly id                 : string;
    readonly name               : string;
    readonly origin             : string;
    readonly timestamp          : number;

    readonly log                : Logger;
    readonly dao?               : Dao;
    readonly cache?             : Cache;

    private state               : OperationState;

    private readonly notifier?  : Notifier;
    private readonly dispatcher?: Dispatcher;

    private readonly tasks      : Task[];
    private readonly notices    : Map<string,Notice[]>;
    
    private readonly deferred   : ActionEnvelope<any,any>[];

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(config: OperationConfig, services?: OperationServices, logger?: Logger) {

        validateConfig(config);
        this.id = config.id;
        this.name = config.name;
        this.origin = config.origin;
        this.timestamp = Date.now();

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

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    notify(target: string, notice: Notice, immediate = false): void {
        if (!notice) throw new TypeError('Cannot register notice: notice is undefined');
        if (!this.notifier) throw new Error('Cannot register notice: notifier not initialized');
        if (this.isClosed) throw new Error('Cannot register notice: operation already closed');

        if (immediate) {
            this.notifier.send(target, notice);
            return;
        }
        
        const notices = this.notices.get(target) || [];
        for (let i = 0; i < notices.length; i++) {
            if (!notice[i]) continue;
            let merged = notice.merge(notices[i]);
            if (merged) {
                notices[i] = null;
                notice = merged;
            }
        }
        notices.push(notice);
        this.notices.set(target, notices);
    }

    dispatch(task: Task, immediate = false): void {
        if (!task) throw new TypeError('Cannot dispatch task: task is undefined');
        if (!this.dispatcher) throw new Error('Cannot dispatch task: dispatcher not initialized');
        if (this.isClosed) throw new Error('Cannot dispatch task: operation already closed');
        
        if (immediate) {
            this.dispatcher.send(task);
            return;
        }
        
        for (let i = 0; i < this.tasks.length; i++) {
            if (!this.tasks[i]) continue;
            let merged = task.merge(this.tasks[i]);
            if (merged) {
                this.tasks[i] = null;
                task = merged;
            }
        }
        this.tasks.push(task);
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
    async execute(actions: Action<any,any>[], inputs: any): Promise<any> {

        // validate and update the state
        if (this.state === OperationState.closed) throw new Error('Cannot execute operation: operation already closed');
        if (this.state >= OperationState.started) throw new Error('Cannot execute operation: operation already started');
        this.state = OperationState.started;

        let result = inputs;
        try {
            // execute the actions
            for (let action of actions) {
                let start = Date.now();
                this.log.debug(`Executing ${action.name} action`);
                result = await action.call(this, result);
                this.log.debug(`Executed ${action.name} action in ${Date.now() - start} ms`);
            }

            // try to commit changes to the database
            if (this.dao) {
                if (!this.dao.isActive) throw new Error('Dao was closed outside of execution cycle');
                await this.dao.close('commit');
            }
        }
        catch (error) {
            // if the dao is still active, try to roll back
            if (this.dao && this.dao.isActive) {
                await this.dao.close('rollback');
            }
            
            // mark operation as closed and re-throw the error
            this.state = OperationState.closed;
            throw error;
        }

        // mark the operation as sealed
        this.state = OperationState.sealed;

        // execute deferred actions
        await this.executeDeferredActions();

        // send out tasks and notices
        const taskPromise = this.flushTasks();
        const noticePromise = this.flushNotices();
        await Promise.all([taskPromise, noticePromise]);

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

    private flushNotices(): Promise<any> {
        if (!this.notifier || this.notices.size === 0) return Promise.resolve();

        let promises: Promise<any>[] = [];
        for (let [target, notices] of this.notices) {
            promises.push(this.notifier.send(target, notices.filter(NotNull)));
        }
        this.notices.clear();

        return Promise.all(promises);
    }

    private flushTasks(): Promise<any> {
        if (!this.dispatcher || this.tasks.length === 0) return Promise.resolve();
        const tasks = this.tasks.filter(NotNull);
        const promise = this.dispatcher.send(tasks);
        this.tasks.length = 0;
        return promise;
    }
}

// HELPER FUNCTIONS
// =================================================================================================
function NotNull(element: any): boolean {
    return (element !== null);
}

function validateConfig(config: OperationConfig) {
    if (!config) throw new TypeError('Operation config is undefined');

    if (typeof config.id !== 'string') throw new TypeError('Operation ID must be a string');
    if (config.id === '') throw new TypeError('Operation ID cannot be an empty string');

    if (typeof config.name !== 'string') throw new TypeError('Operation name must be a string');
    if (config.name === '') throw new TypeError('Operation name cannot be an empty string');

    if (typeof config.origin !== 'string') throw new TypeError('Operation origin must be a string');
    if (config.origin === '') throw new TypeError('Operation origin cannot be an empty string');
}

function validateLogger(logger?: Logger): Logger {
    if (!logger) return console;

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