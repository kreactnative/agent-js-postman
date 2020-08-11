/*
 *  Copyright 2020 EPAM Systems
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const { getOptions, RPClient } = require('./mocks/reportportal-client.mock');
const Reporter = require('./../lib/reporter');
const utils = require('./../lib/utils');

const options = getOptions();

describe('reporter', () => {
    let reporter;

    beforeAll(() => {
        const emitter = {
            on: jest.fn()
        };

        reporter = new Reporter(emitter, options, {});
        reporter.client = new RPClient();
        reporter.launchObj.tempId = 'startLaunch';
    });

    afterEach(() => {
        jest.clearAllMocks();
        reporter.tempLaunchId = '';
        reporter.tempSuiteId = '';
        reporter.tempTestId = '';
        reporter.collectionRunOptions = {};
        reporter.suitesStackTempInfo = [];
        reporter.collectionMap.clear();
    });

    afterAll(() => {
        reporter = null;
    });

    describe('constructor', () => {
        test('client and options should be defined', () => {
            expect(reporter.options).toBeDefined();
            expect(reporter.client).toBeDefined();
        });
    });

    describe('onStart', () => {
        test('should call client.startTestItem with parameters with type SUITE', () => {
            const expectedTestItemDataObj = {
                type: 'SUITE',
                name: 'name',
                description: 'content description',
                attributes: 'attributes'
            };
            reporter.collectionRunOptions = {
                collection: {
                    name: 'name',
                    description: {
                        content: 'content description'
                    }
                }
            };
            jest.spyOn(utils, 'getAttributes').mockImplementation(() => 'attributes');

            reporter.onStart(null, { cursor: { ref: 'ref' } });

            expect(reporter.client.startTestItem).toHaveBeenCalledTimes(1);
            expect(reporter.client.startTestItem).toHaveBeenCalledWith(expectedTestItemDataObj, 'startLaunch');
        });

        test('should not call client.startTestItem if there is an error', () => {
            expect(() => reporter.onStart('error')).toThrowError('error');
            expect(reporter.client.startTestItem).not.toHaveBeenCalled();
        });
    });

    describe('onBeforeRequest', () => {
        let sendRequestLogs;
        let getCurrentSuiteTempId;

        beforeEach(() => {
            sendRequestLogs = jest.spyOn(reporter, 'sendRequestLogs').mockImplementation(() => {});
            getCurrentSuiteTempId = jest.spyOn(reporter, 'getCurrentSuiteTempId').mockImplementation(() => 'parentId');
        });

        afterEach(() => {
            sendRequestLogs.mockRestore();
            getCurrentSuiteTempId.mockRestore();
        });

        test('should call client.startTestItem with parameters with type TEST', () => {

            const testItemDataObj = {
                name: 'name',
                type: 'TEST',
                description: 'description',
                attributes: 'attributes'
            };
            const expectedCollectionMap = new Map([['ref', {
                testId: 'startTestItem',
                requestId: 'id',
                steps: []
            }]]);
            reporter.collectionRunOptions = {
                environment: {},
                collection: {}
            };
            jest.spyOn(utils, 'getAttributes').mockImplementation(() => 'attributes');

            reporter.onBeforeRequest(null, {
                item: { name: 'name', id: 'id' },
                cursor: { ref: 'ref' },
                request: {
                    description: { content: 'description' }
                }
            });

            expect(reporter.client.startTestItem).toHaveBeenCalledTimes(1);
            expect(reporter.client.startTestItem).toHaveBeenCalledWith(testItemDataObj, 'startLaunch', 'parentId');
            expect(reporter.sendRequestLogs).toHaveBeenCalledWith('startTestItem', {
                description: { content: 'description' }
            });
            expect(reporter.collectionMap).toEqual(expectedCollectionMap);
        });

        test('should not call client.startTestItem if there is an error', () => {
            expect(() => reporter.onBeforeRequest('error')).toThrowError('error');
            expect(reporter.client.startTestItem).not.toHaveBeenCalled();
        });
    });

    describe('onBeforeTest', () => {
        test('should call client.startTestItem with parameters with type STEP', () => {
            const testItemDataObj = {
                name: 'step name',
                type: 'STEP'
            };
            const expectedSteps = [{
                stepId: 'startTestItem',
                name: 'step name'
            }];
            reporter.collectionMap = new Map([['ref', {
                testId: 'startTestItem',
                steps: []
            }]]);
            reporter.collectionRunOptions = {
                environment: {}
            };
            jest.spyOn(utils, 'getStepNames').mockImplementation(() => ['step name']);

            reporter.onBeforeTest(null, {
                events: [{
                    listen: 'test',
                    script: {
                        exec: ['step name']
                    }
                }],
                cursor: { ref: 'ref' }
            });

            expect(reporter.client.startTestItem).toHaveBeenCalledTimes(1);
            expect(reporter.client.startTestItem).toHaveBeenCalledWith(testItemDataObj, 'startLaunch', 'startTestItem');
            expect(reporter.collectionMap.get('ref').steps).toEqual(expectedSteps);
        });

        test('should not call client.startTestItem if there is an error', () => {
            expect(() => reporter.onBeforeTest('error')).toThrowError('error');
            expect(reporter.client.startTestItem).not.toHaveBeenCalled();
        });
    });

    describe('onBeforeDone', () => {
        let finishSteps;
        let finishTest;
        let finishSuite;

        beforeEach(() => {
            finishSteps = jest.spyOn(reporter, 'finishSteps').mockImplementation(() => {});
            finishTest = jest.spyOn(reporter, 'finishTest').mockImplementation(() => {});
            finishSuite = jest.spyOn(reporter, 'finishSuite').mockImplementation(() => {});
        });

        afterEach(() => {
            finishSteps.mockRestore();
            finishTest.mockRestore();
            finishSuite.mockRestore();
        });

        test('should call finishSteps, finishTest and finishSuite with parameters', () => {
            const expectedTestObj = { steps: [], testId: 'startTestItem' };
            reporter.collectionMap = new Map([['ref', {
                testId: 'startTestItem',
                steps: []
            }]]);

            reporter.onBeforeDone(null, {
                summary: { run: 'run' }
            });

            expect(reporter.finishSteps).toHaveBeenCalledTimes(1);
            expect(reporter.finishTest).toHaveBeenCalledTimes(1);
            expect(reporter.finishSuite).toHaveBeenCalledTimes(1);
            expect(reporter.finishSteps).toHaveBeenCalledWith('ref', expectedTestObj, 'run');
            expect(reporter.finishTest).toHaveBeenCalledWith('ref', expectedTestObj, 'run');
            expect(reporter.finishSuite).toHaveBeenCalledWith();
        });

        test('should not call finishTest, finishSteps and finishSuite if there is an error', () => {
            expect(() => reporter.onBeforeDone('error')).toThrowError('error');
            expect(reporter.finishSteps).not.toHaveBeenCalled();
            expect(reporter.finishTest).not.toHaveBeenCalled();
            expect(reporter.finishSuite).not.toHaveBeenCalled();
        });
    });

    describe('onDone', () => {
        test('should call client.finishLaunch with parameters, status is failed', () => {
            reporter.onDone(null, {
                run: { failures: 'failures' }
            });

            expect(reporter.client.finishLaunch).toHaveBeenCalledTimes(1);
            expect(reporter.client.finishLaunch).toHaveBeenCalledWith('startLaunch', { status: 'FAILED' });
        });

        test('should call client.finishLaunch with parameters, status is passed', () => {
            reporter.onDone(null, {
                run: {}
            });

            expect(reporter.client.finishLaunch).toHaveBeenCalledTimes(1);
            expect(reporter.client.finishLaunch).toHaveBeenCalledWith('startLaunch', { status: 'PASSED' });
        });

        test('should not call client.finishLaunch if there is an error', () => {
            expect(() => reporter.onDone('error')).toThrowError('error');
            expect(reporter.client.finishLaunch).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentSuiteTempId', () => {
        test('should return current suite tempId if suitesStackTempInfo is not empty', () => {
            reporter.suitesStackTempInfo = [{ tempId: 'tempId' }];

            const tempId = reporter.getCurrentSuiteTempId();

            expect(tempId).toEqual('tempId');
        });

        test('should return null if suitesStackTempInfo is empty', () => {
            reporter.suitesStackTempInfo = [];

            const tempId = reporter.getCurrentSuiteTempId();

            expect(tempId).toEqual(null);
        });
    });

    describe('logMessage', () => {
        test('should call client.sendLog with parameters', () => {
            reporter.logMessage('id', 'value', 'level');

            expect(reporter.client.sendLog).toHaveBeenCalledTimes(1);
            expect(reporter.client.sendLog).toHaveBeenCalledWith('id', { level: 'level', message: 'value' });
        });

        test('should call client.sendLog with parameters, default level', () => {
            reporter.logMessage('id', 'value');

            expect(reporter.client.sendLog).toHaveBeenCalledTimes(1);
            expect(reporter.client.sendLog).toHaveBeenCalledWith('id', { level: 'INFO', message: 'value' });
        });
    });

    describe('sendRequestLogs', () => {
        test('should call logMessage with parameters two times', () => {
            jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});

            reporter.sendRequestLogs('stepId', {
                url: {
                    toString: () => 'https://postman-echo.com'
                },
                method: 'method',
                headers: { members: [] }
            });

            expect(reporter.logMessage).toHaveBeenCalledTimes(2);
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: URL: https://postman-echo.com');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Method: method');
        });

        test('should call logMessage with parameters three times if headers array is not empty', () => {
            jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});

            reporter.sendRequestLogs('stepId', {
                url: {
                    toString: () => 'https://postman-echo.com'
                },
                method: 'method',
                headers: { members: [{ key: 'key', value: 'value' }] }
            });

            expect(reporter.logMessage).toHaveBeenCalledTimes(3);
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: URL: https://postman-echo.com');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Method: method');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Headers: key:value');
        });

        test('should call logMessage with parameters four times if body exist', () => {
            jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});

            reporter.sendRequestLogs('stepId', {
                url: {
                    toString: () => 'https://postman-echo.com'
                },
                method: 'method',
                headers: { members: [{ key: 'key', value: 'value' }] },
                body: {
                    toString: () => 'body'
                }
            });

            expect(reporter.logMessage).toHaveBeenCalledTimes(4);
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: URL: https://postman-echo.com');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Method: method');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Headers: key:value');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Request: Body: body');
        });
    });

    describe('sendResponseLogs', () => {
        test('should call logMessage with parameters four times', () => {
            jest.spyOn(reporter, 'logMessage').mockImplementation(() => {});
            jest.spyOn(reporter.decoder, 'write').mockImplementation(() => 'body');

            reporter.sendResponseLogs('stepId', {
                code: 'code',
                status: 'status',
                headers: { members: [{ key: 'key', value: 'value' }] },
                stream: {}
            });

            expect(reporter.logMessage).toHaveBeenCalledTimes(4);
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Response: Code: code');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Response: Status: status');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Response: Headers: key:value');
            expect(reporter.logMessage).toHaveBeenCalledWith('stepId', 'Response: Body: body');
        });
    });

    describe('finishSteps', () => {
        test('should call failAllSteps with parameters if if there is an error in a test-scripts', () => {
            const testObj = {
                testId: 'startTestItem',
                steps: [{
                    stepId: 'startTestItem',
                    requestId: 'id',
                    name: 'step name'
                }]
            };
            const runObj = {
                executions: [{ id: 'id' }],
                failures: [{
                    at: 'test-script',
                    cursor: {
                        ref: 'ref'
                    },
                    error: {
                        message: 'scriptFailureError'
                    }
                }]
            };
            jest.spyOn(reporter, 'failAllSteps');
            jest.spyOn(reporter, 'sendResponseLogs').mockImplementation(() => {});

            reporter.finishSteps('ref', testObj, runObj);

            expect(reporter.failAllSteps).toHaveBeenCalledWith(testObj, 'scriptFailureError');
        });

        test('should call logMessage and client.finishTestItem if there are failures, status is failed', () => {
            const testObj = {
                testId: 'startTestItem',
                steps: [{
                    stepId: 'startTestItem',
                    requestId: 'id',
                    name: 'step name'
                }]
            };
            const runObj = {
                executions: [{ id: 'id' }],
                failures: [{
                    cursor: {
                        ref: 'ref'
                    },
                    error: {
                        test: 'step name',
                        message: 'error'
                    }
                }]
            };
            jest.spyOn(reporter, 'logMessage');
            jest.spyOn(reporter, 'sendResponseLogs').mockImplementation(() => {});

            reporter.finishSteps('ref', testObj, runObj);

            expect(reporter.logMessage).toHaveBeenCalledWith('startTestItem', 'error', 'ERROR');
            expect(reporter.client.finishTestItem).toHaveBeenCalledWith('startTestItem', { status: 'FAILED' });
        });

        test('should call client.finishTestItem with status passed', () => {
            const testObj = {
                testId: 'startTestItem',
                steps: [{
                    stepId: 'startTestItem',
                    requestId: 'id',
                    name: 'step name'
                }]
            };
            const runObj = {
                executions: [{ id: 'id' }],
                failures: []
            };
            jest.spyOn(reporter, 'sendResponseLogs').mockImplementation(() => {});

            reporter.finishSteps('ref', testObj, runObj);

            expect(reporter.client.finishTestItem).toHaveBeenCalledWith('startTestItem', { status: 'PASSED' });
        });
    });

    describe('failAllSteps', () => {
        test('should call client.finishTestItem with status failed and logMessage with error', () => {
            const testObj = {
                steps: [{
                    stepId: 'startTestItem'
                }]
            };
            jest.spyOn(reporter, 'logMessage');

            reporter.failAllSteps(testObj, 'error');

            expect(reporter.logMessage).toHaveBeenCalledWith('startTestItem', 'error', 'ERROR');
            expect(reporter.client.finishTestItem).toHaveBeenCalledWith('startTestItem', { status: 'FAILED' });
        });
    });

    describe('finishTest', () => {
        test('should call logMessage with ERROR and client.finishTestItem with status failed if there is requestError', () => {
            const testObj = {
                testId: 'startTestItem',
                requestId: 'id'
            };
            const runObj = {
                executions: [{
                    id: 'id',
                    requestError: {
                        message: 'requestError'
                    }
                }]
            };
            jest.spyOn(reporter, 'logMessage');

            reporter.finishTest('ref', testObj, runObj);

            expect(reporter.logMessage).toHaveBeenCalledWith('startTestItem', 'requestError', 'ERROR');
            expect(reporter.client.finishTestItem).toHaveBeenCalledWith('startTestItem', { status: 'FAILED' });
        });

        test('should call sendResponseLogs and client.finishTestItem with status failed if cursor.ref is the same as reference', () => {
            const testObj = {
                testId: 'startTestItem',
                requestId: 'id'
            };
            const runObj = {
                failures: [{
                    cursor: {
                        ref: 'ref'
                    }
                }],
                executions: [{
                    id: 'id',
                    response: 'response'
                }]
            };
            jest.spyOn(reporter, 'sendResponseLogs');

            reporter.finishTest('ref', testObj, runObj);

            expect(reporter.sendResponseLogs).toHaveBeenCalledWith('startTestItem', 'response');
            expect(reporter.client.finishTestItem).toHaveBeenCalledWith('startTestItem', { status: 'FAILED' });
        });

        test('should call sendResponseLogs and client.finishTestItem with status passed if cursor.ref is not the same as reference', () => {
            const testObj = {
                testId: 'startTestItem',
                requestId: 'id'
            };
            const runObj = {
                failures: [{
                    cursor: {
                        ref: 'refTwo'
                    }
                }],
                executions: [{
                    id: 'id',
                    response: 'response'
                }]
            };
            jest.spyOn(reporter, 'sendResponseLogs');

            reporter.finishTest('ref', testObj, runObj);

            expect(reporter.sendResponseLogs).toHaveBeenCalledWith('startTestItem', 'response');
            expect(reporter.client.finishTestItem).toHaveBeenCalledWith('startTestItem', { status: 'PASSED' });
        });
    });

    describe('finishSuite', () => {
        let getCurrentSuiteTempId;

        beforeEach(() => {
            getCurrentSuiteTempId = jest.spyOn(reporter, 'getCurrentSuiteTempId').mockImplementation(() => 'parentId');
        });

        afterEach(() => {
            getCurrentSuiteTempId.mockRestore();
        });

        test('should call client.finishTestItem with correct parameters', () => {
            reporter.finishSuite();

            expect(reporter.client.finishTestItem).toHaveBeenCalledWith('parentId', {});
        });
    });
});
