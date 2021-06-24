import { stub } from 'sinon';
import { ControllerMessenger } from '../ControllerMessenger';
import {
  GasFeeController,
  GetGasFeeState,
  GasFeeStateChange,
} from './GasFeeController';

const name = 'GasFeeController';

function getRestrictedMessenger() {
  const controllerMessenger = new ControllerMessenger<
    GetGasFeeState,
    GasFeeStateChange
  >();
  const messenger = controllerMessenger.getRestricted<
    typeof name,
    never,
    never
  >({
    name,
  });
  return messenger;
}

describe('GasFeeController', () => {
  let gasFeeController: GasFeeController;

  beforeEach(() => {
    gasFeeController = new GasFeeController({
      interval: 10000,
      messenger: getRestrictedMessenger(),
      getProvider: () => stub(),
      onNetworkStateChange: () => stub(),
      getCurrentNetworkEIP1559Compatibility: () => Promise.resolve(true), // change this for networkController.state.properties.isEIP1559Compatible ???
    });
  });

  afterEach(() => {
    gasFeeController.destroy();
  });

  it('should initialize', async () => {
    expect(gasFeeController.name).toBe(name);
  });

  it('should getGasFeeEstimatesAndStartPolling', async () => {
    const result = await gasFeeController.getGasFeeEstimatesAndStartPolling(
      undefined,
    );
    expect(result).toHaveLength(36);
  });

  it('should _fetchGasFeeEstimateData', async () => {
    const estimates = await gasFeeController._fetchGasFeeEstimateData();
    expect(estimates).toHaveProperty('gasFeeEstimates');
  });
});