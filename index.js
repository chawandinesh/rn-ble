/* eslint-disable prettier/prettier */
/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import BleScreen from './screens/BluetoothScreen';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => BleScreen);
