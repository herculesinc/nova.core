import * as chai from 'chai';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import { OperationConfig, Cache, Dao, Notifier, Dispatcher, Context } from '@nova/core';
import { MockCache, MockLogger, MockDao, MockNotice, MockNotifier, MockDispatcher, MockTask } from './mocks';
import * as nova from '../index';

const config: OperationConfig = {
    id      : 'id',
    name    : 'name',
    origin  : 'origin',
    actions : []
};

const expect = chai.expect;

describe('NOVA.CORE -> \'Operation\' tests;', () => {
    describe('Creating an \'Operation\';', () => {
        it('should create new operation', () => {
            const operation = new nova.Operation(config);

            expect(operation).to.not.be.undefined;
            expect(operation.id).to.equal(config.id);
            expect(operation.name).to.equal(config.name);
            expect(operation.origin).to.equal(config.origin);
            expect(operation.timestamp).to.be.at.most(Date.now());

            expect(operation.log).to.equal(nova.logger);
            expect(operation.dao).to.be.undefined;
            expect(operation.cache).to.be.undefined;
        });
        it('should create new operation with custom logger', () => {
            const logger = new MockLogger();
            const operation = new nova.Operation(config, null, logger);

            expect(operation.log).to.equal(logger);
            expect(operation.dao).to.be.undefined;
            expect(operation.cache).to.be.undefined;
        });
        it('should return an error if operation ID is missing', function () {
            expect(() => new nova.Operation({...config, id: ''})).to.throw(TypeError, 'Operation ID is missing or invalid');
        });
        it('should return an error if operation name is missing', function () {
            expect(() => new nova.Operation({...config, name: ''})).to.throw(TypeError, 'Operation name is missing or invalid');
        });
        it('should return an error if operation origin is missing', function () {
            expect(() => new nova.Operation({...config, origin: ''})).to.throw(TypeError, 'Operation origin is missing or invalid');
        });
        it('should return an error if operation actions are missing', function () {
            expect(() => new nova.Operation({...config, actions: undefined})).to.throw(TypeError, 'Operation actions are missing or invalid');
        });
        it('should return an error if operation action is not a function', function () {
            expect(() => new nova.Operation({...config, actions: ['string' as any]})).to.throw(TypeError, 'Operation action is not a function');
        });
        it('should return an error operation action is an arrow function', function () {
            expect(() => new nova.Operation({...config, actions: [(() => {}) as any]})).to.throw(TypeError, 'Operation action cannot be an arrow function');
        });
    });

    describe('Executing an operation via \'Operation.execute()\'', () => {
        let operation: nova.Operation;
        let action: any, executeSpy: any;

        const inputs = 'inputs';
        const result = 'result';

        beforeEach(async () => {
            action = sinon.stub().returns(result);
        });

        it('should be done without exceptions', async () => {
            operation = new nova.Operation(config, null, new MockLogger());

            await operation.execute(undefined);
        });

        describe('without actions', () => {
            beforeEach(async () => {
                operation = new nova.Operation(config, null, new MockLogger());

                executeSpy = sinon.spy(operation, 'execute');

                await operation.execute(inputs);
            });

            it('should be executed once', async () => {
                expect(executeSpy.called).to.be.true;
                expect(executeSpy.callCount).to.equal(1);
            });
            it('should be executed with correct context', () => {
                expect(executeSpy.firstCall.thisValue).to.equal(operation);
            });
            it('should be executed with correct arguments', () => {
                expect(executeSpy.firstCall.calledWithExactly(inputs)).to.be.true;
            });
            it('should return correct result', () => {
                expect(executeSpy.firstCall.returnValue).to.be.a('promise');
                expect(executeSpy.firstCall.returnValue).to.eventually.equal(inputs);
            });
        });

        describe('with action', () => {
            beforeEach(async () => {
                action  = sinon.stub().returns(result);
                operation = new nova.Operation({...config, actions: [action]}, null, new MockLogger());

                executeSpy = sinon.spy(operation, 'execute');

                await operation.execute(inputs);
            });

            it('should be executed once', async () => {
                expect(executeSpy.called).to.be.true;
                expect(executeSpy.callCount).to.equal(1);
            });
            it('should be executed with correct context', () => {
                expect(executeSpy.firstCall.thisValue).to.equal(operation);
            });
            it('should be executed with correct arguments', () => {
                expect(executeSpy.firstCall.calledWithExactly(inputs)).to.be.true;
            });
            it('should return correct result', () => {
                expect(executeSpy.firstCall.returnValue).to.be.a('promise');
                expect(executeSpy.firstCall.returnValue).to.eventually.equal(result);
            });
        });

        describe('call notify() method without notifier', () => {
            beforeEach(async () => {
                async function testAction(this: Context, inputs: any) {
                    await this.notify(new MockNotice());
                }

                action  = sinon.spy(testAction);

                operation = new nova.Operation({...config, actions: [action]}, null, new MockLogger());
            });

            it('should throw an exception', async () => {
                try {
                    await operation.execute(inputs);
                } catch (err) {
                    expect(err.message).to.equal('Cannot register notice: notifier not initialized');
                }
            });
        });

        describe('call dispatch() method without dispatcher', () => {
            beforeEach(async () => {
                async function testAction(this: Context, inputs: any) {
                    await this.dispatch(new MockTask());
                }

                action  = sinon.spy(testAction);

                operation = new nova.Operation({...config, actions: [action]}, null, new MockLogger());
            });

            it('should throw an exception', async () => {
                try {
                    await operation.execute(inputs);
                } catch (err) {
                    expect(err.message).to.equal('Cannot dispatch task: dispatcher not initialized');
                }
            });
        });
    });

    describe('Executing operation actions', () => {
        let operation: nova.Operation;
        let firstAction: any, secondAction: any;

        const inputs = 'inputs';
        const fResult = 1;
        const sResult = 10;

        beforeEach(async () => {
            firstAction  = sinon.stub().returns(fResult);
            secondAction = sinon.stub().returns(sResult);

            operation = new nova.Operation({...config, actions:[firstAction, secondAction, firstAction]}, null, new MockLogger());

            await operation.execute(inputs);
        });

        describe('first action', () => {
            it('should be executed twice', () => {
                expect(firstAction.called).to.be.true;
                expect(firstAction.callCount).to.equal(2);
            });
            it('should be executed with correct context', () => {
                expect(firstAction.firstCall.thisValue).to.equal(operation);
                expect(firstAction.secondCall.thisValue).to.equal(operation);
            });
            it('should be executed with correct arguments', () => {
                expect(firstAction.firstCall.calledWithExactly(inputs)).to.be.true;
                expect(firstAction.secondCall.calledWithExactly(sResult)).to.be.true;
            });
        });

        describe('second action', () => {
            it('should be executed once', () => {
                expect(secondAction.called).to.be.true;
                expect(secondAction.callCount).to.equal(1);
            });
            it('should be executed with correct context', () => {
                expect(secondAction.firstCall.thisValue).to.equal(operation);
            });
            it('should be executed with correct arguments', () => {
                expect(secondAction.firstCall.calledWithExactly(fResult)).to.be.true;
            });
        });
    });

    describe('Executing an operation with \'Cache\' service', () => {
        let operation: nova.Operation;
        let cache: Cache;
        let actionSpy: any, cacheSpy: any;

        const opInput = 'opInput';
        const cKey    = 'cKey';

        beforeEach(async () => {
            cache = new MockCache();

            async function testAction(this: Context, inputs: any) {
                this.cache.get(cKey);
            }

            cacheSpy  = sinon.spy(cache, 'get');
            actionSpy = sinon.spy(testAction);

            operation = new nova.Operation({...config, actions:[actionSpy]}, { cache }, new MockLogger());

            await operation.execute(opInput);
        });
        it('operation should have cache service', () => {
            expect(operation.cache).to.equal(cache);
        });
        it('action context should have cache service', () => {
            expect(actionSpy.firstCall.thisValue.cache).to.equal(cache);
        });
        it('should be executed once', () => {
            expect(cacheSpy.called).to.be.true;
            expect(cacheSpy.callCount).to.equal(1);
        });
        it('should be executed with correct context', () => {
            expect(cacheSpy.firstCall.thisValue).to.equal(cache);
        });
        it('should be executed with correct arguments', () => {
            expect(cacheSpy.firstCall.calledWithExactly(cKey)).to.be.true;
        });
    });

    describe('Executing an operation with \'Dao\' service', () => {
        let operation: nova.Operation;
        let dao: Dao;
        let actionSpy: any, daoSpy: any;

        describe('when action is performed without error', () => {
            beforeEach(async () => {
                dao = new MockDao();

                daoSpy  = sinon.spy(dao, 'close');
                actionSpy = sinon.stub().returns(null);

                operation = new nova.Operation({...config, actions:[actionSpy]}, { dao }, new MockLogger());

                await operation.execute(undefined);
            });

            it('operation should have dao service', () => {
                expect(operation.dao).to.equal(dao);
            });
            it('action context should have dao service', () => {
                expect(actionSpy.firstCall.thisValue.dao).to.equal(dao);
            });
            it('dao close() method should be called once', () => {
                expect(daoSpy.called).to.be.true;
                expect(daoSpy.callCount).to.equal(1);
            });
            it('dao close() method should be called with \'commit\' parameter', () => {
                expect(daoSpy.firstCall.calledWithExactly('commit')).to.be.true;
            });
        });

        describe('when action throws exception', () => {
            const exception = 'exception';

            beforeEach(async () => {
                dao = new MockDao();

                daoSpy  = sinon.spy(dao, 'close');
                actionSpy = sinon.stub().throws(new Error(exception));

                operation = new nova.Operation({...config, actions:[actionSpy]}, { dao }, new MockLogger());

                try {
                    await operation.execute(undefined);
                } catch (err) {
                    expect(err.message).to.equal(exception);
                }
            });

            it('operation should have dao service', () => {
                expect(operation.dao).to.equal(dao);
            });
            it('action context should have dao service', () => {
                expect(actionSpy.firstCall.thisValue.dao).to.equal(dao);
            });
            it('dao close() method should be executed once', () => {
                expect(daoSpy.called).to.be.true;
                expect(daoSpy.callCount).to.equal(1);
            });
            it('dao close() method should be called with \'rollback\' parameter', () => {
                expect(daoSpy.firstCall.calledWithExactly('rollback')).to.be.true;
            });
        });
    });

    describe('Executing an operation with \'Notifier\' service', () => {
        let operation: nova.Operation;
        let notifier: Notifier;
        let actionSpy: any, sendSpy: any, completedSpy: any;

        describe('sending immediate notice', () => {
            beforeEach(async () => {
                notifier = new MockNotifier();

                sendSpy = sinon.spy(notifier, 'send');
                completedSpy = sinon.stub();

                async function testAction(this: Context, inputs: any) {
                    this.notify(new MockNotice());
                    completedSpy();
                }

                actionSpy = sinon.spy(testAction);

                operation = new nova.Operation({...config, actions:[actionSpy]}, { notifier }, new MockLogger());

                await operation.execute(undefined);
            });

            it('notifier send() method should be executed once', () => {
                expect(sendSpy.called).to.be.true;
                expect(sendSpy.callCount).to.equal(1);
            });
            it('notifier send() method should be executed before the action completed', () => {
                expect(sendSpy.firstCall.calledAfter(actionSpy.firstCall)).to.be.true;
                expect(sendSpy.firstCall.calledBefore(completedSpy.firstCall)).to.be.true;
            });
        });
    });

    describe('Executing an operation with \'Dispatcher\' service', () => {
        let operation: nova.Operation;
        let dispatcher: Dispatcher;
        let actionSpy: any, sendSpy: any, flushSpy: any, completedSpy: any;

        describe('sending immediate task', () => {
            beforeEach(async () => {
                dispatcher = new MockDispatcher();

                sendSpy = sinon.spy(dispatcher, 'send');
                completedSpy = sinon.stub();

                async function testAction(this: Context, inputs: any) {
                    this.dispatch(new MockTask());
                    completedSpy();
                }

                actionSpy = sinon.spy(testAction);

                operation = new nova.Operation({...config, actions:[actionSpy]}, { dispatcher }, new MockLogger());

                await operation.execute(undefined);
            });

            it('dispatcher send() method should be executed once', () => {
                expect(sendSpy.called).to.be.true;
                expect(sendSpy.callCount).to.equal(1);
            });
            it('dispatcher send() method should be executed before the action completed', () => {
                expect(sendSpy.firstCall.calledAfter(actionSpy.firstCall)).to.be.true;
                expect(sendSpy.firstCall.calledBefore(completedSpy.firstCall)).to.be.true;
            });
        });
    });

    describe('Executing an operation with deferred actions', () => {
        let operation: nova.Operation;
        let deferSpy: any, completedSpy: any;

        const dInputs = 'inputs';

        describe('Executing deferred actions inside actions', () => {
            beforeEach(async () => {
                deferSpy = sinon.stub();
                completedSpy = sinon.stub();

                async function action(this: Context, inputs: any) {
                    this.defer(deferSpy, dInputs);
                    completedSpy();
                }

                operation = new nova.Operation({...config, actions:[action]}, null, new MockLogger());

                await operation.execute(undefined);
            });

            it('deferred action should be executed once', () => {
                expect(deferSpy.called).to.be.true;
                expect(deferSpy.callCount).to.equal(1);
            });
            it('deferred action should be executed with correct context', () => {
                expect(deferSpy.firstCall.thisValue).to.equal(operation);
            });
            it('deferred action should be executed with correct arguments', () => {
                expect(deferSpy.firstCall.calledWithExactly(dInputs)).to.be.true;
            });
            it('deferred action should be executed after action completed', () => {
                expect(completedSpy.called).to.be.true;
                expect(deferSpy.firstCall.calledAfter(completedSpy.firstCall)).to.be.true;
            });
        });

        describe('Executing deferred actions inside other deferred actions', () => {
            let error: any;

            beforeEach(async () => {
                deferSpy = sinon.stub();

                async function dAction(this: Context, inputs: any) {
                    this.defer(deferSpy, inputs);
                }
                async function action(this: Context, inputs: any) {
                    this.defer(dAction, inputs);
                }

                operation = new nova.Operation({...config, actions:[action]}, null, new MockLogger());

                try {
                    await operation.execute(undefined);
                } catch (err) {
                    error = err.message;
                }
            });

            it('should return an error', () => {
                expect(error).to.equal('Cannot defer an action: operation already sealed');
            });
            it('second deferred action should not be called', () => {
                expect(deferSpy.called).to.be.false;
            });
        });

        describe('Deferring multiple actions when actions can not be merged', () => {
            let error;

            const oInputs = {inputs: true};

            beforeEach(async () => {
                deferSpy = sinon.stub();

                async function sAction(this: Context, inputs: any) {
                    this.defer(deferSpy, inputs);
                }
                async function fAction(this: Context, inputs: any) {
                    this.defer(deferSpy, inputs);
                }

                operation = new nova.Operation({...config, actions:[sAction, fAction]}, null, new MockLogger());

                await operation.execute(oInputs);
            });

            it('second deferred action should be called twice', () => {
                expect(deferSpy.called).to.be.true;
                expect(deferSpy.callCount).to.equal(2);
            });

            it('deferred actions should be called with correct arguments', () => {
                expect(deferSpy.firstCall.calledWithExactly(oInputs)).to.be.true;
                expect(deferSpy.secondCall.calledWithExactly(undefined)).to.be.true;
            });
        });

        describe('Deferring multiple actions when actions can be merged', () => {
            let error;

            const d1Inputs = {foo: true};
            const d2Inputs = {foo: false, bar: 'baz'};

            beforeEach(async () => {
                deferSpy = sinon.stub();

                async function sAction(this: Context, inputs: any) {
                    this.defer(dAction, d1Inputs);
                }
                async function fAction(this: Context, inputs: any) {
                    this.defer(dAction, d2Inputs);
                }
                async function dAction(this: Context, inputs: any) {
                    deferSpy(inputs);
                }

                (dAction as any).merge = (i1: any, i2: any): object => ({...i1, ...i2});

                operation = new nova.Operation({...config, actions:[fAction, sAction]}, null, new MockLogger());

                await operation.execute({test: true});
            });

            it('deferred action should be called once', () => {
                expect(deferSpy.called).to.be.true;
                expect(deferSpy.callCount).to.equal(1);
            });

            it('deferred action should be called with correct arguments', () => {
                expect(deferSpy.firstCall.calledWithExactly(d2Inputs)).to.be.true;
            });
        });
    });
});
