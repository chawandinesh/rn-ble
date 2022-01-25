/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {
  Button,
  FlatList,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BleManager from 'react-native-ble-manager';

interface IList {
  name: string;
  id: string;
  rssi: number;
  advertising: any;
}
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
const peripherals = new Map();

const App = () => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<IList[] | []>([]);
  const [pairedDevices, setpairedDevices] = useState<IList[] | []>([]);

  const getBondedPeripherals = () => {
    BleManager.getBondedPeripherals()
      .then((response: any[]) => {
        setpairedDevices(response);
      })
      .catch(err => {
        console.log(err, 'error bond');
      });
  };
  const handleDiscoverPeripheral = (peripheral: IList) => {
    getBondedPeripherals();
    if (!peripheral.name) {
      peripheral.name = peripheral.id;
    }
    peripherals.set(peripheral.id, peripheral);
    setAvailableDevices(Array.from(peripherals.values()));
  };
  const handleStopScan = () => {
    setScanning(false);
  };

  console.log(pairedDevices, availableDevices);
  const pairDevice = (peripheralId: string) => {
    BleManager.createBond(peripheralId)
      .then(() => {
        console.log('createBond success or there is already an existing one');
        startScan();
      })
      .catch(() => {
        console.log('fail to bond');
      });
  };

  const unPairDevice = (peripheralId: string) => {
    BleManager.removeBond(peripheralId)
      .then(() => {
        console.log('removed success or there is already an existing one');
        startScan();
      })
      .catch(() => {
        console.log('fail to bond');
      });
  };

  useEffect(() => {
    setAvailableDevices([]);
    BleManager.start({showAlert: false});
    BleManager.enableBluetooth();
    bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );

    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan);

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
      bleManagerEmitter.removeListener(
        'BleManagerDiscoverPeripheral',
        handleDiscoverPeripheral,
      );
      bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan);
    };
  }, []);

  const startScan = () => {
    setAvailableDevices([]);
    setpairedDevices([]);
    if (!scanning) {
      BleManager.scan([], 13, true)
        .then(() => {
          setScanning(true);
        })
        .catch(err => {
          console.error(err);
        });
    }
  };

  const renderPairedDevice = ({item}: {item: IList}) => {
    return (
      <View style={styles.bt__device__container}>
        <View style={styles.bt__device__name__container}>
          <Text style={styles.bt__device__name}>{item.name}</Text>
        </View>
        <View style={styles.bt__device__btn__container}>
          <TouchableOpacity
            style={styles.bt__device__btn}
            onPress={() => unPairDevice(item.id)}>
            <Text style={styles.bt__device__btn__name}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAvaileableDevice = ({item}: {item: IList}) => {
    return (
      <View style={styles.bt__device__container}>
        <View style={styles.bt__device__name__container}>
          <Text style={styles.bt__device__name}>{item.name}</Text>
        </View>
        <View style={styles.bt__device__btn__container}>
          <TouchableOpacity
            style={styles.bt__device__btn}
            onPress={() => pairDevice(item.id)}>
            <Text style={styles.bt__device__btn__name}>Connect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.top__container}>
      <Text style={styles.title}>Bluetooth Project</Text>
      <View style={styles.divider}></View>
      <View>
        <Button
          onPress={startScan}
          color="#16a"
          title={scanning ? 'Scanning...' : 'Scan devices'}
        />
      </View>
      <View style={styles.available__devices__container}>
        <View style={styles.available__devices__title__container}>
          <Text style={styles.available__devices__title}>
            Available Devices
          </Text>
        </View>
        <FlatList
          data={availableDevices}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={renderAvaileableDevice}
        />
      </View>

      <View style={styles.available__devices__container}>
        <View style={styles.available__devices__title__container}>
          <Text style={styles.available__devices__title}>Paired Devices</Text>
        </View>
        <FlatList
          data={pairedDevices}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={renderPairedDevice}
        />
      </View>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  top__container: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 30,
    padding: 10,
    fontFamily: 'cursive',
  },
  divider: {
    height: 1,
    backgroundColor: '#000',
  },
  available__devices__container: {
    flex: 4,
  },
  available__devices__title__container: {
    padding: 10,
  },
  available__devices__title: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  bt__device__container: {
    backgroundColor: '#ddd',
    borderBottomWidth: 1,
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bt__device__name__container: {},
  bt__device__name: {
    fontSize: 20,
    paddingVertical: 5,
  },
  bt__device__btn__container: {},
  bt__device__btn: {},
  bt__device__btn__name: {
    fontWeight: 'bold',
    marginRight: 15,
  },
});
