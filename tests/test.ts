// IMPORTS
// =================================================================================================
import { Context, OperationConfig, OperationServices } from '@nova/core';
import * as nova from '../index';
import { MockCache } from './mocks';

// MODULE VARIABLES
// =================================================================================================
const opConfig: OperationConfig = {
    id      : 'testId',
    name    : 'testName',
    origin  : 'testOrigin',
    actions : [testAction]
};

const opServices: OperationServices = {
    cache   : new MockCache()
};

async function testAction(this: Context, inputs: any) {
    this.cache.get('test key');
    this.defer(nova.actions.clearCache, ['test key1']);
    this.defer(nova.actions.clearCache, ['test key2']);
    return { inputs, processed: true };
}

// TESTS
// =================================================================================================
(async function runTest() {
    const inputs = { test: 'testing' };

    const operation = new nova.Operation(opConfig, opServices);
    const result = await operation.execute(inputs);
    
    console.log('-'.repeat(100));
    console.log(JSON.stringify(result));
})();