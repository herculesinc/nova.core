import * as chai from 'chai';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import {OperationConfig, Logger, Action, Cache, Context, OperationServices} from '@nova/core';
import * as nova from '../index';
import {MockCache} from './mocks';

const config: OperationConfig = {
    id      : 'id',
    name    : 'name',
    origin  : 'origin',
    actions : []
};

const aFunc = () => {};
const defLogger: Logger = {
    debug: aFunc,
    error: aFunc,
    info: aFunc,
    warn: aFunc
};

const expect = chai.expect;

describe('NOVA.CORE -> \'Opration\' tests;', () => {
    describe('Creating an \'Operation\';', () => {
        it('should create new operation', () => {
            const operation = new nova.Operation(config);

            expect(operation).to.not.be.undefined;
            expect(operation.id).to.equal(config.id);
            expect(operation.name).to.equal(config.name);
            expect(operation.origin).to.equal(config.origin);
            expect(operation.timestamp).to.be.at.most(Date.now());

            expect(operation.log).to.equal(console);
            expect(operation.dao).to.be.undefined;
            expect(operation.cache).to.be.undefined;
        });
        it('should return an error', function () {
            expect(() => new nova.Operation({...config, id: ''})).to.throw(TypeError, 'Operation ID is missing or invalid');
        });
        it('should return an error', function () {
            expect(() => new nova.Operation({...config, name: ''})).to.throw(TypeError, 'Operation name is missing or invalid');
        });
        it('should return an error', function () {
            expect(() => new nova.Operation({...config, origin: ''})).to.throw(TypeError, 'Operation origin is missing or invalid');
        });
        it('should return an error', function () {
            expect(() => new nova.Operation({...config, actions: undefined})).to.throw(TypeError, 'Operation actions are missing or invalid');
        });
        it('should return an error', function () {
            expect(() => new nova.Operation({...config, actions: ['string' as any]})).to.throw(TypeError, 'Operation action is not a function');
        });
        it('should return an error', function () {
            expect(() => new nova.Operation({...config, actions: [(() => {}) as any]})).to.throw(TypeError, 'Operation action cannot be an arrow function');
        });
    });

    describe('Executing an operation via \'Operation.execute()\'', () => {
        let operation: nova.Operation;
        let action, executeSpy;

        const inputs = 'inputs';
        const result = 'result';

        beforeEach(async () => {
            action = sinon.stub().returns(result);
        });

        it('should be done without exceptions', async () => {
            operation = new nova.Operation(config, null, defLogger);

            await operation.execute(undefined);
        });

        describe('without actions', () => {
            beforeEach(async () => {
                operation = new nova.Operation(config, null, defLogger);

                executeSpy = sinon.spy(operation, 'execute');

                await operation.execute(inputs);
            });

            it('should be executed once', async () => {
                expect((executeSpy as any).called).to.be.true;
                expect((executeSpy as any).callCount).to.equal(1);
            });
            it('should be executed with right context', () => {
                expect(executeSpy.firstCall.thisValue).to.equal(operation);
            });
            it('should be executed with right arguments', () => {
                expect(executeSpy.firstCall.calledWithExactly(inputs)).to.be.true;
            });
            it('should return right inputs', () => {
                expect(executeSpy.firstCall.returnValue).to.be.a('promise');
                expect(executeSpy.firstCall.returnValue).to.eventually.equal(inputs);
            });
        });

        describe('with action', () => {
            beforeEach(async () => {
                action  = sinon.stub().returns(result);
                operation = new nova.Operation({...config, actions: [action]}, null, defLogger);

                executeSpy = sinon.spy(operation, 'execute');

                await operation.execute(inputs);
            });

            it('should be executed once', async () => {
                expect((executeSpy as any).called).to.be.true;
                expect((executeSpy as any).callCount).to.equal(1);
            });
            it('should be executed with right context', () => {
                expect(executeSpy.firstCall.thisValue).to.equal(operation);
            });
            it('should be executed with right arguments', () => {
                expect(executeSpy.firstCall.calledWithExactly(inputs)).to.be.true;
            });
            it('should return right inputs', () => {
                expect(executeSpy.firstCall.returnValue).to.be.a('promise');
                expect(executeSpy.firstCall.returnValue).to.eventually.equal(result);
            });
        });

        // notify, and dispatch should return error
    });

    describe('Executing operation actions', () => {
        let operation: nova.Operation;
        let firstAction, secondAction;

        const inputs = 'inputs';
        const fResult = 1;
        const sResult = 10;

        beforeEach(async () => {
            firstAction  = sinon.stub().returns(fResult);
            secondAction = sinon.stub().returns(sResult);

            operation = new nova.Operation({...config, actions:[firstAction, secondAction, firstAction]}, null, defLogger);

            await operation.execute(inputs);
        });

        describe('first action', () => {
            it('should be executed twice', () => {
                expect((firstAction as any).called).to.be.true;
                expect((firstAction as any).callCount).to.equal(2);
            });
            it('should be executed with right context', () => {
                expect(firstAction.firstCall.thisValue).to.equal(operation);
                expect(firstAction.secondCall.thisValue).to.equal(operation);
            });
            it('should be executed with right arguments', () => {
                expect(firstAction.firstCall.calledWithExactly(inputs)).to.be.true;
                expect(firstAction.secondCall.calledWithExactly(sResult)).to.be.true;
            });
        });

        describe('second action', () => {
            it('should be executed once', () => {
                expect((secondAction as any).called).to.be.true;
                expect((secondAction as any).callCount).to.equal(1);
            });
            it('should be executed with right context', () => {
                expect(secondAction.firstCall.thisValue).to.equal(operation);
            });
            it('should be executed with right arguments', () => {
                expect(secondAction.firstCall.calledWithExactly(fResult)).to.be.true;
            });
        });
    });

    describe('Executing an operation with \'Cash\' service', () => {
        let operation: nova.Operation;
        let cache: Cache;
        let actionSpy, cacheSpy;

        const opInput = 'opInput';
        const cKey    = 'cKey';

        beforeEach(async () => {
            cache = new MockCache();

            async function testAction(this: Context, inputs: any) {
                this.cache.get(cKey);
            }

            cacheSpy  = sinon.spy(cache, 'get');
            actionSpy = sinon.spy(testAction);

            operation = new nova.Operation({...config, actions:[actionSpy]}, { cache }, defLogger);

            await operation.execute(opInput);
        });

        it('action context should have cache service', () => {
            expect(actionSpy.firstCall.thisValue.cache).to.equal(cache);
        });
        it('should be executed once', () => {
            expect((cacheSpy as any).called).to.be.true;
            expect((cacheSpy as any).callCount).to.equal(1);
        });
        it('should be executed with right context', () => {
            expect(cacheSpy.firstCall.thisValue).to.equal(cache);
        });
        it('should be executed with right arguments', () => {
            expect(cacheSpy.firstCall.calledWithExactly(cKey)).to.be.true;
        });
    });

    // doa section

    // notifier section (notify fn -> imidiate(sent once, else after execute end) right merge
    // dispatcher section as notifier
    // deferred action section
});
