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
        readonly cache?     : CacheClient;

        readonly isSealed   : boolean;

        defer<V,T>(action: Action<V,T>, inputs: V): void;

        notify(target: string, notice: Notice, immediate?: boolean): void;
        dispatch(task: Task, immediate?: boolean): void;
    }

    export interface OperationConfig {
        readonly id         : string;
        readonly name       : string;
        readonly origin     : string;
        readonly logger     : Logger;
    }

    export interface OperationServices {
        readonly dao?       : Dao;
        readonly cache?     : CacheClient;
        readonly notifier?  : NotifierClient;
        readonly dispatcher?: DispatcherClient;
    }

    // ACTION
    // --------------------------------------------------------------------------------------------
    export interface Action<V,T> {
        (inputs: V, context: Operation): Promise<T>;
        merge?  : (i1: V, i2: V) => V;
    }

    // EXECUTOR
    // --------------------------------------------------------------------------------------------
    export interface ExecutorConfig {
        readonly database?      : Database;
        readonly cache?         : CacheFactory;
        readonly dispatcher?    : DispatcherFactory;
        readonly notifier?      : NotifierFactory;
    }

    export class Executor {

        constructor(config: ExecutorConfig);

        createContext(config: OperationConfig): Promise<Operation>;
        closeContext(context: Operation, error?: Error): Promise<void>;

        execute(actions: Action<any,any>[], inputs: any, context: Operation): Promise<any>;
    }

    export interface OperationOptions {
        readonly dao?       : DaoOptions;
    }

    // DATABASE
    // --------------------------------------------------------------------------------------------
    export interface Database {
        getClient(options: DaoOptions, logger: Logger): Dao;
    }

    export interface DaoOptions {
        readonly    : boolean;
    }

    export interface Dao {
        readonly isActive       : boolean;
        readonly isReadOnly     : boolean;

        close(action: 'commit' | 'rollback'): Promise<any>;
    }

    // CACHE
    // --------------------------------------------------------------------------------------------
    export interface CacheFactory {
        getClient(logger: Logger): CacheClient;
    }

    export interface CacheClient {
        get(key: string)    : Promise<any>;
        get(keys: string[]) : Promise<any[]>;

        set(key: string, value: any, expires?: number): void;

        clear(key: string)      : Promise<any>;
        clear(keys: string[])   : Promise<any>;

        invalidate(key: string)     : void;
        isInvalidated(key: string)  : Boolean;

        flush(): Promise<any>;
    }

    // DISPATCHER
    // --------------------------------------------------------------------------------------------
    export interface DispatcherFactory {
        getClient(logger: Logger): DispatcherClient;
    }

    export interface DispatcherClient {
        send(task: Task)    : Promise<any>;
        send(tasks: Task[]) : Promise<any>;
    }

    export interface Task {
        readonly name       : string;
        readonly payload    : object;
        readonly delay?     : number;
        readonly ttl?       : number;

        merge(task: Task): Task;
    }

    // NOTIFIER
    // --------------------------------------------------------------------------------------------
    export interface NotifierFactory {
        getClient(logger: Logger) : NotifierClient;
    }

    export interface NotifierClient {
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
    export interface TraceSource {
        readonly name   : string;
        readonly type   : string;
    }

    export interface TraceCommand {
        readonly name   : string;
        readonly text   : string;
    }

    export interface Logger {        
        debug(message: string) : void;
        info(message: string)  : void;
        warn(message: string)  : void;

        error(error: Error)     : void;
        trace(source: TraceSource, command: TraceCommand, duration: number, success: boolean): void;
    }
}