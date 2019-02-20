declare module "@nova/core" {

    // OPERATION
    // --------------------------------------------------------------------------------------------
    export interface Operation extends Executable, Context {
        new(config: OperationConfig, services?: OperationServices, logger?: Logger): Operation;
    }
    export const Operation: Operation;

    export interface Context {
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

        notify(notice: Notice): Promise<void>;
        notify(notices: Notice[]): Promise<void>;

        dispatch(task: Task): Promise<void>;
        dispatch(tasks: Task[]): Promise<void>;
    }

    export interface Executable {
        execute(inputs: any): Promise<any>;
    }

    export interface OperationConfig {
        readonly id         : string;
        readonly name       : string;
        readonly origin     : string;
        readonly actions    : Action[];
    }

    export interface OperationServices {
        readonly dao?       : Dao;
        readonly cache?     : Cache;
        readonly notifier?  : Notifier;
        readonly dispatcher?: Dispatcher;
    }

    // ACTIONS
    // --------------------------------------------------------------------------------------------
    export interface Action<V=any, T=any> {
        (this: Context, inputs: V): Promise<T>;
        merge?: (i1: V, i2: V) => V | undefined;
    }

    export const actions: {
        clearCache  : Action<string[], any>;
        dispatch    : Action<Task | Task[], any>;
        notify      : Action<Notice | Notice[], any>;
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
        get(key: string)    : Promise<any>;
        get(keys: string[]) : Promise<any[]>;

        set(key: string, value: any, expires?: number): Promise<any>;

        clear(key: string)      : Promise<void>;
        clear(keys: string[])   : Promise<void>;
    }

    // DISPATCHER
    // --------------------------------------------------------------------------------------------
    export interface Dispatcher {
        send(tasks: Task | Task[]) : Promise<any>;
    }

    export interface Task {
        readonly name       : string;
        readonly payload    : object;
        readonly delay?     : number;
        readonly ttl?       : number;

        readonly merge?     : (task: Task) => Task | undefined;
    }

    // NOTIFIER
    // --------------------------------------------------------------------------------------------
    export interface Notifier {
        send(notices: Notice | Notice[]) : Promise<any>;
    }

    export interface Notice {
        readonly target     : string;
        readonly payload    : object;

        readonly merge?     : (notice: Notice) => Notice | undefined;
    }

    // LOGGER
    // --------------------------------------------------------------------------------------------
    export interface TraceSource {
        readonly name   : string;
        readonly type   : string;
    }

    export interface TraceCommand {
        readonly name   : string;
        readonly text?  : string;
    }

    export interface Logger {        
        debug(message: string)  : void;
        info(message: string)   : void;
        warn(message: string)   : void;
        error(error: Error)     : void;

        trace(source: TraceSource, command: string, duration: number, success: boolean): void;
        trace(source: TraceSource, command: TraceCommand, duration: number, success: boolean): void;
    }

    export const logger: Logger;

    // EXCEPTION
    // --------------------------------------------------------------------------------------------
    export interface ExceptionOptions {
        name?       : string;
        status?     : number;
        message?    : string;
        code?       : number;
        cause?      : Error;
        stackStart? : Function;
    }

    export class Exception extends Error {

        readonly name           : string;
        readonly status         : number;
        readonly code?          : number;
        readonly cause?         : Error;
    
        headers?                : { [header: string]: string; };
        details?                : any;

        readonly isClientError  : boolean;
        readonly isServerError  : boolean;

        constructor(options: ExceptionOptions);
        constructor(message: string, status?: number);

        toJSON(): any;
    }

    // EXCEPTION
    // --------------------------------------------------------------------------------------------
    export const enum HttpStatusCode {
        OK                  = 200,
        Created             = 201,
        Accepted            = 202,
        NoContent           = 204,
        BadRequest          = 400,
        Unauthorized        = 401,
        InvalidInputs       = 402,
        Forbidden           = 403,
        NotFound            = 404,
        NotAllowed          = 405,
        NotAcceptable       = 406,
        PayloadTooLarge     = 413,
        UnsupportedContent  = 415,
        NotReady            = 425,
        TooManyRequests     = 429,
        InternalServerError = 500,
        NotImplemented      = 501,
        ServiceUnavailable  = 503
    }

    export const HttpCodeNames: Map<HttpStatusCode, string>;
}