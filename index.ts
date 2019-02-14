// IMPORTS
// =================================================================================================
import { Operation as IOperation, OperationConfig, OperationServices, Logger, Action } from '@nova/core';
import { Operation } from './lib/Operation';
import * as commonActions from './lib/actions';

// MODULE FUNCTIONS
// =================================================================================================
export function create(config: OperationConfig, services?: OperationServices, logger?: Logger): IOperation {
    return new Operation(config, services, logger);
}

export async function execute(operation: IOperation, actions: Action<any,any>[], inputs: any): Promise<any> {
    
    const op = (operation as Operation);
    if (typeof op.execute !== 'function') throw new TypeError('Operation executor could not be found');

    return op.execute(actions, inputs);
}

// RE-EXPORTS
// =================================================================================================
export const actions = commonActions;