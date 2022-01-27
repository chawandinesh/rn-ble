/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
/**
 * Sample BLE React Native App
 *
 * @format
 * @flow strict-local
 */

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
} from 'react-native';
import {Button} from 'react-native-paper';
import {Colors} from 'react-native/Libraries/NewAppScreen';

import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const BleScreen = () => {
  const [isScanning, setIsScanning] = useState(false);
  const peripherals = new Map();
  const [list, setList] = useState<any[]>([]);

  const startScan = () => {
    if (!isScanning) {
      BleManager.scan([], 3, true)
        .then(() => {
          setIsScanning(true);
        })
        .catch(err => {
          console.error(err);
        });
    }
  };

  const handleStopScan = () => {
    console.log('Scan is stopped');
    setIsScanning(false);
  };

  const handleDisconnectedPeripheral = (data: any) => {
    let peripheral = peripherals.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      peripherals.set(peripheral.id, peripheral);
      setList(Array.from(peripherals.values()));
    }
    console.log('Disconnected from ' + data.peripheral);
  };

  const handleUpdateValueForCharacteristic = (data: any) => {
    console.log(
      'Received data from ' +
        data.peripheral +
        ' characteristic ' +
        data.characteristic,
      data.value,
    );
  };

  const retrieveConnected = () => {
    BleManager.getConnectedPeripherals([]).then(results => {
      if (results.length === 0) {
        console.log('No connected peripherals');
      }
      console.log(results);
      for (var i = 0; i < results.length; i++) {
        var peripheral: any = results[i];
        peripheral.connected = true;
        peripherals.set(peripheral.id, peripheral);
        setList(Array.from(peripherals.values()));
      }
    });
  };

  const handleDiscoverPeripheral = (peripheral: any) => {
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    peripherals.set(peripheral.id, peripheral);
    setList(Array.from(peripherals.values()));
  };

  const testPeripheral = (peripheral: any) => {
    if (peripheral) {
      if (peripheral.connected) {
        BleManager.disconnect(peripheral.id);
      } else {
        BleManager.connect(peripheral.id)
          .then(() => {
            let p = peripherals.get(peripheral.id);
            if (p) {
              p.connected = true;
              peripherals.set(peripheral.id, p);
              setList(Array.from(peripherals.values()));
            }
            console.log('Connected to ' + peripheral.id);
            setTimeout(() => {
              /* Test read current RSSI value */
              BleManager.retrieveServices(peripheral.id).then(
                peripheralData => {
                  console.log('Retrieved peripheral services', peripheralData);
                  BleManager.readRSSI(peripheral.id).then(rssi => {
                    console.log('Retrieved actual RSSI value', rssi);
                    let pId = peripherals.get(peripheral.id);
                    if (pId) {
                      pId.rssi = rssi;
                      peripherals.set(peripheral.id, pId);
                      setList(Array.from(peripherals.values()));
                    }
                  });
                },
              );
            }, 900);
          })
          .catch(error => {
            console.log('Connection error', error);
          });
      }
    }
  };

  useEffect(() => {
    BleManager.start({showAlert: false});

    bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);
    bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      handleDisconnectedPeripheral,
    );
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic,
    );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(result => {
        if (result) {
          console.log('Permission is OK');
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(response => {
            if (response) {
              console.log('User accept');
            } else {
              console.log('User refuse');
            }
          });
        }
      });
    }

    return () => {
      console.log('unmount');
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
      bleManagerEmitter.removeAllListeners('BleManagerStopScan');
      bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
      bleManagerEmitter.removeAllListeners(
        'BleManagerDidUpdateValueForCharacteristic',
      );
    };
  }, []);

  const renderItem = (item: any) => {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight onPress={() => testPeripheral(item)}>
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text style={styles.bleTitleContainer}>{item.name}</Text>
          <Text style={styles.rssiText}>RSSI: {item.rssi}</Text>
          <Text style={styles.bleItemId}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.body}>
            <View style={styles.isScanningButtonContainer}>
              <Button
                mode="outlined"
                loading={isScanning}
                onPress={() => startScan()}>
                {' '}
                {isScanning ? 'Scanning....' : 'Scan'}
              </Button>
            </View>

            <View style={styles.isScanningButtonContainer}>
              <Button mode="outlined" onPress={() => retrieveConnected()}>
                Retrieve connected peripherals
              </Button>
            </View>
          </View>
          {list.length == 0 && (
            <View style={styles.noPeripheralsContainer}>
              <Text style={styles.noPeripheralsText}>No peripherals</Text>
            </View>
          )}
        </ScrollView>
        <FlatList
          data={list}
          renderItem={({item}) => renderItem(item)}
          keyExtractor={item => item.id}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
  row: {},
  rssiText: {
    fontSize: 10,
    textAlign: 'center',
    color: '#333333',
    padding: 2,
  },
  bleItemId: {
    fontSize: 8,
    textAlign: 'center',
    color: '#333333',
    padding: 2,
    paddingBottom: 20,
  },
  noPeripheralsContainer: {
    flex: 1,
    margin: 20,
  },
  noPeripheralsText: {
    textAlign: 'center',
  },
  isScanningButtonContainer: {margin: 10},
  bleTitleContainer: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333333',
    padding: 10,
  },
});

export default BleScreen;
