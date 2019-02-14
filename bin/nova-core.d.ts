declare module "@nova/core" {

    // OPERATION
    // --------------------------------------------------------------------------------------------
    export interface Operation {
        readonly id         : string;
        readonly name       : string;
        readonly origin     : string;
        readonly timestamp  : number;

        readonly log        : Logger;
        readonly dao?       : Dao;
        readonly cache?     : Cache;

        readonly isSealed   : boolean;
        readonly isClosed   : boolean;

        run<V,T>(action: Action<V,T>, inputs: V): Promise<T>;
        defer<V,T>(action: Action<V,T>, inputs: V): void;

        notify(target: string, notice: Notice, immediate?: boolean): void;
        dispatch(task: Task, immediate?: boolean): void;
    }

    export interface OperationConfig {
        readonly id         : string;
        readonly name       : string;
        readonly origin     : string;
    }

    export interface OperationServices {
        readonly dao?       : Dao;
        readonly cache?     : Cache;
        readonly notifier?  : Notifier;
        readonly dispatcher?: Dispatcher;
    }

    export function create(config: OperationConfig, services?: OperationServices, logger?: Logger): Operation;
    export function execute(operation: Operation, actions: Action<any,any>[], inputs: any): Promise<any>;

    // ACTIONS
    // --------------------------------------------------------------------------------------------
    export interface Action<V=any, T=any> {
        (this: Operation, inputs: V): Promise<T>;
        merge?: (i1: V, i2: V) => V;
    }

    export const actions: {
        clearCache  : Action<Set<string>, any>;
    };

    // DATABASE
    // --------------------------------------------------------------------------------------------
    export interface Dao {
        readonly isActive       : boolean;
        readonly isReadOnly     : boolean;

        close(action: 'commit' | 'rollback'): Promise<any>;
    }

    // CACHE
    // --------------------------------------------------------------------------------------------
    export interface Cache {
        get(key: string): Promise<any>;
        get(keys: string[]): Promise<any[]>;

        set(key: string, value: any, expires?: number): void;

        clear(key: string): void;
        clear(keys: string[]): void;
    }

    // DISPATCHER
    // --------------------------------------------------------------------------------------------
    export interface Dispatcher {
        send(task: Task)    : Promise<any>;
        send(tasks: Task[]) : Promise<any>;
    }

    export interface Task {
        readonly name       : string;
        readonly payload    : object;
        readonly delay?     : number;
        readonly ttl?       : number;

        merge(task: Task)   : Task;
    }

    // NOTIFIER
    // --------------------------------------------------------------------------------------------
    export interface Notifier {
        send(target: string, notice: Notice)    : Promise<any>;
        send(target: string, notices: Notice[]) : Promise<any>;
    }

    export interface Notice {
        readonly event      : string;
        readonly payload    : object;

        merge(notice: Notice): Notice;
    }

    // LOGGER
    // --------------------------------------------------------------------------------------------
    export interface Logger {        
        debug(message: string) : void;
        info(message: string)  : void;
        warn(message: string)  : void;
        error(error: Error)    : void;
    }
}