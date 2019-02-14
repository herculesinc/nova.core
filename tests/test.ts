// IMPORTS
// =================================================================================================
import { Operation, OperationConfig, OperationServices } from '@nova/core';
import * as nova from '../index';
import { MockCache } from './mocks';

// MODULE VARIABLES
// =================================================================================================
const opConfig: OperationConfig = {
    id      : 'testId',
    name    : 'testName',
    origin  : 'testOrigin'
};

const opServices: OperationServices = {
    cache   : new MockCache()
};

async function testAction(this: Operation, inputs: any) {
    this.cache.get('test key');
    this.defer(nova.actions.clearCache, ['test key1']);
    this.defer(nova.actions.clearCache, ['test key2']);
    return { inputs, processed: true };
}

// TESTS
// =================================================================================================
(async function runTest() {
    const inputs = { test: 'testing' };

    const operation = nova.create(opConfig, opServices);
    const result = await nova.execute(operation, [testAction], inputs);
    
    console.log('-'.repeat(100));
    console.log(JSON.stringify(result));
})();