import * as chai from 'chai';
import * as sinon from 'sinon';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import {OperationConfig, Logger, Action, Cache, Dao, Notifier, Dispatcher, Context, OperationServices} from '@nova/core';
import {MockCache, MockLogger, MockDao, MockNotice, MockNotifier, MockDispatcher, MockTask} from './mocks';
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
                operation = new nova.Operation({...config, actions: [action]}, null, new MockLogger());

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

        describe('call the notify method without notifier', () => {
            beforeEach(async () => {
                async function testAction(this: Context, inputs: any) {
                    this.notify('target', new MockNotice());
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

        describe('call the dispatch method without dispatcher', () => {
            beforeEach(async () => {
                async function testAction(this: Context, inputs: any) {
                    this.dispatch(new MockTask());
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
        let firstAction, secondAction;

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

    describe('Executing an operation with \'Dao\' service', () => {
        let operation: nova.Operation;
        let dao: Dao;
        let actionSpy, daoSpy;

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
            it('should be executed once', () => {
                expect((daoSpy as any).called).to.be.true;
                expect((daoSpy as any).callCount).to.equal(1);
            });
            it('should be executed with right context', () => {
                expect(daoSpy.firstCall.thisValue).to.equal(dao);
            });
            it('should be executed with right arguments', () => {
                expect(daoSpy.firstCall.calledWithExactly('commit')).to.be.true;
            });
        });

        describe('when action throw exception', () => {
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
            it('should be executed once', () => {
                expect((daoSpy as any).called).to.be.true;
                expect((daoSpy as any).callCount).to.equal(1);
            });
            it('should be executed with right context', () => {
                expect(daoSpy.firstCall.thisValue).to.equal(dao);
            });
            it('should be executed with right arguments', () => {
                expect(daoSpy.firstCall.calledWithExactly('rollback')).to.be.true;
            });
        });
    });

    describe('Executing an operation with \'Notifier\' service', () => {
        let operation: nova.Operation;
        let notifier: Notifier;
        let actionSpy, sendSpy, flushSpy;

        describe('should be send immediate', () => {
            beforeEach(async () => {
                notifier = new MockNotifier();

                sendSpy = sinon.spy(notifier, 'send');

                async function testAction(this: Context, inputs: any) {
                    this.notify('test', new MockNotice(), true);
                }

                actionSpy = sinon.spy(testAction);

                operation = new nova.Operation({...config, actions:[actionSpy]}, { notifier }, new MockLogger());

                flushSpy = sinon.spy(operation, 'flushNotices');

                await operation.execute(undefined);
            });

            it('operation should have notifier service', () => {
                expect((operation as any).notifier).to.equal(notifier);
            });
            it('notifier send method should be executed once', () => {
                expect((sendSpy as any).called).to.be.true;
                expect((sendSpy as any).callCount).to.equal(1);
            });
            it('notifier send method should be executed after action', () => {
                expect(sendSpy.firstCall.calledAfter(actionSpy.firstCall)).to.be.true;
            });
            it('notifier send method should be executed before flushNotices method', () => {
                expect((flushSpy as any).called).to.be.true;
                expect(sendSpy.firstCall.calledBefore(flushSpy.firstCall)).to.be.true;
            });
        });

        describe('should be send deferred', () => {
            beforeEach(async () => {
                notifier = new MockNotifier();

                sendSpy = sinon.spy(notifier, 'send');

                async function testAction(this: Context, inputs: any) {
                    this.notify('test', new MockNotice(), false);
                }

                actionSpy = sinon.spy(testAction);

                operation = new nova.Operation({...config, actions:[actionSpy]}, { notifier }, new MockLogger());

                flushSpy = sinon.spy(operation, 'flushNotices');

                await operation.execute(undefined);
            });

            it('notifier send method should be executed once', () => {
                expect((sendSpy as any).called).to.be.true;
                expect((sendSpy as any).callCount).to.equal(1);
            });
            it('notifier send method should be executed after action', () => {
                expect(sendSpy.firstCall.calledAfter(actionSpy.firstCall)).to.be.true;
            });
            it('notifier send method should be executed after flushNotices method', () => {
                expect((flushSpy as any).called).to.be.true;
                expect(sendSpy.firstCall.calledAfter(flushSpy.firstCall)).to.be.true;
            });
        });
    });

    describe('Executing an operation with \'Dispatcher\' service', () => {
        let operation: nova.Operation;
        let dispatcher: Dispatcher;
        let actionSpy, sendSpy, flushSpy;

        describe('should be send immediate', () => {
            beforeEach(async () => {
                dispatcher = new MockDispatcher();

                sendSpy = sinon.spy(dispatcher, 'send');

                async function testAction(this: Context, inputs: any) {
                    this.dispatch(new MockTask(), true);
                }

                actionSpy = sinon.spy(testAction);

                operation = new nova.Operation({...config, actions:[actionSpy]}, { dispatcher }, new MockLogger());

                flushSpy = sinon.spy(operation, 'flushTasks');

                await operation.execute(undefined);
            });

            it('operation should have dispatcher service', () => {
                expect((operation as any).dispatcher).to.equal(dispatcher);
            });
            it('dispatcher send method should be executed once', () => {
                expect((sendSpy as any).called).to.be.true;
                expect((sendSpy as any).callCount).to.equal(1);
            });
            it('dispatcher send method should be executed after action', () => {
                expect(sendSpy.firstCall.calledAfter(actionSpy.firstCall)).to.be.true;
            });
            it('dispatcher send method should be executed before flushTasks method', () => {
                expect((flushSpy as any).called).to.be.true;
                expect(sendSpy.firstCall.calledBefore(flushSpy.firstCall)).to.be.true;
            });
        });

        describe('should be send deferred', () => {
            beforeEach(async () => {
                dispatcher = new MockDispatcher();

                sendSpy = sinon.spy(dispatcher, 'send');

                async function testAction(this: Context, inputs: any) {
                    this.dispatch(new MockTask(), false);
                }

                actionSpy = sinon.spy(testAction);

                operation = new nova.Operation({...config, actions:[actionSpy]}, { dispatcher }, new MockLogger());

                flushSpy = sinon.spy(operation, 'flushTasks');

                await operation.execute(undefined);
            });

            it('dispatcher send method should be executed once', () => {
                expect((sendSpy as any).called).to.be.true;
                expect((sendSpy as any).callCount).to.equal(1);
            });
            it('dispatcher send method should be executed after action', () => {
                expect(sendSpy.firstCall.calledAfter(actionSpy.firstCall)).to.be.true;
            });
            it('dispatcher send method should be executed after flushTasks method', () => {
                expect((flushSpy as any).called).to.be.true;
                expect(sendSpy.firstCall.calledAfter(flushSpy.firstCall)).to.be.true;
            });
        });
    });

    describe('Executing an operation with deferred actions', () => {
        let operation: nova.Operation;
        let deferSpy, executeDeferSpy;

        const dInputs = 'inputs';

        beforeEach(async () => {
            deferSpy = sinon.stub();

            async function action(this: Context, inputs: any) {
                this.defer(deferSpy, dInputs);
            }

            operation = new nova.Operation({...config, actions:[action]}, null, new MockLogger());

            executeDeferSpy = sinon.spy(operation, 'executeDeferredActions');

            await operation.execute(undefined);
        });

        it('deferred action should be executed once', () => {
            expect((deferSpy as any).called).to.be.true;
            expect((deferSpy as any).callCount).to.equal(1);
        });
        it('deferred action should be executed with right context', () => {
            expect(deferSpy.firstCall.thisValue).to.equal(operation);
        });
        it('deferred action should be executed with right arguments', () => {
            expect(deferSpy.firstCall.calledWithExactly(dInputs)).to.be.true;
        });
        it('deferred action should be executed after executeDeferredActions action', () => {
            expect((executeDeferSpy as any).called).to.be.true;
            expect(deferSpy.firstCall.calledAfter(executeDeferSpy.firstCall)).to.be.true;
        });
    });
});
