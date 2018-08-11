/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ToastAndroid,
  Dimensions,
  TouchableOpacity,
  Button,
  Image,
  TextInput,
  Keyboard,
  Animated,
  BackHandler,
  FlatList,
  Alert,
  TouchableNativeFeedback
} from 'react-native';

import { Fab, Icon } from 'native-base';

import MapView, { AnimatedRegion } from 'react-native-maps';
import Polyline from '@mapbox/polyline';
import DeviceInfo from 'react-native-device-info';
import AutoCompleteFList from './src/components/AutoCompleteFList';
import Backend from './src/components/Backend';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.008;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default class App extends Component {
  constructor(props) {
    super(props);
    this.uniqueID = null;
    this.state = {
      region: {
        latitude: null,
        longitude: null,
        latitudeDelta: null,
        longitudeDelta: null
      },
      initialRegion: {
        latitude: null,
        longitude: null,
        latitudeDelta: null,
        longitudeDelta: null
      },
      regionAnimated: {
        latitude: null,
        longitude: null,
        latitudeDelta: null,
        longitudeDelta: null
      },
      searchedPlaceMarker: {
        latitude: null,
        longitude: null,
        title: null,
        description: null
      },
      liveLocation: {
        _id: null,
        coords: {
          latitude: null,
          longitude: null
        }
      },
      error: null,
      coords: [],
      bounceValue: new Animated.Value(700),
      isHidden: true,
      autoCompPredictions: [],
      usersLocations: [],
      searchText: '',
      fListRefresh: false
    };
    console.ignoredYellowBox = ['Setting a timer'];
  }

  componentWillMount() {
    this.setState({
      initialRegion: {
        latitude: 15,
        longitude: 60,
        latitudeDelta: 100,
        longitudeDelta: 100
      }
    });
    this.findMe('CWM');
    console.log('<------------ Calling Firebase Backend ------------>');
    this.getDeviceInfo();
    this.loadNewLocations();
    // this.loadUpdatedLocations();
  }

  componentDidMount() {
    setTimeout(() => {
      this.mapView.animateToRegion(this.state.regionAnimated, 1000);
    }, 500);
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
    // add location to the database.
    const intervalId = setInterval(() => {
      if (Backend.getUid().toString() !== '') {
        Backend.sendLocation(this.state.regionAnimated, this.uniqueID);
        clearInterval(intervalId);
      }
    }, 1000);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (
      this.state.liveLocation.latitude !== nextState.liveLocation.latitude
      && this.state.liveLocation.longitude !== nextState.liveLocation.longitude
    ) {
      // update location to firebase.
      Backend.updateLocation(nextState.liveLocation);
    }
    console.log('State ------------> ', nextState);
    return true;
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchId);
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  getGeoCode = async (place_id, description, main_text) => {
    console.log('getGeoCode Method Called');
    await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?placeid=${place_id}&fields=name,geometry,formatted_address&key=AIzaSyA6mytrYC0p9P75O_ZGntD_ycg61kvYkWU`
    )
      .then(response => response.json())
      .then((responseJson) => {
        if (!responseJson.error_message) {
          const { lat, lng } = responseJson.result.geometry.location;
          console.log(`Latitude: ${lat} Longitude: ${lng}`);
          if (!this.state.isHidden) {
            this.toggleSubView();
            this.searchBar.blur();
          }
          this.setState({
            searchedPlaceMarker: {
              latitude: lat,
              longitude: lng,
              title: `${main_text}`,
              description: `${description}`
            }
          });
          this.mapView.animateToRegion(
            {
              latitude: lat,
              longitude: lng,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA
            },
            1500
          );
        }
      })
      .catch((error) => {
        console.log(`${error.message}`);
        throw error;
      });
  };

  getDirection = async () => {
    // direction from new delhi to mumbai
    await fetch(
      'https://maps.googleapis.com/maps/api/directions/json?origin=28.6139,77.2090&destination=19.0760,72.8777&key=AIzaSyA6mytrYC0p9P75O_ZGntD_ycg61kvYkWU'
    )
      .then(response => response.json())
      .then((responseJson) => {
        const points = Polyline.decode(
          responseJson.routes[0].overview_polyline.points
        );
        const coords = points.map(point => ({
          latitude: point[0],
          longitude: point[1]
        }));
        this.setState({ coords });
        return coords;
      })
      .catch((error) => {
        console.log(error.message);
        throw error.message;
      });
  };

  getLiveLocation = () => {
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.setState({
          liveLocation: {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          },
          error: null
        });
      },
      error => this.setState({ error: error.message })
    );
  };

  getAutoComplete = async (searchText) => {
    this.setState({
      searchText
    });
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${searchText}&types=geocode&language=en&key=AIzaSyA6mytrYC0p9P75O_ZGntD_ycg61kvYkWU`
      );
      const resJson = await res.json();
      const arr = [];
      if (resJson.status === 'OK') {
        for (let i = 0; i < resJson.predictions.length; i += 1) {
          const {
            id,
            description,
            place_id,
            structured_formatting
          } = resJson.predictions[i];
          const { main_text } = structured_formatting;
          arr.push({
            description,
            id,
            place_id,
            main_text
          });
        }
        this.setState(prevState => ({
          autoCompPredictions: [...arr],
          fListRefresh: !prevState.fListRefresh
        }));
        console.log(this.state.autoCompPredictions);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  getDeviceInfo = () => {
    this.uniqueID = DeviceInfo.getUniqueID();
    console.log('Device Unique ID: ', this.uniqueID);
  };

  findMe = (source = 'fab') => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (source === 'CWM') {
          this.setState({
            regionAnimated: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA
            },
            error: null
          });
        } else {
          this.setState({
            region: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA
            },
            error: null
          });
        }
        console.log('position: ', position);
        ToastAndroid.show(
          `Latitude: ${position.coords.latitude}  Longitude: ${
            position.coords.longitude
          }`,
          ToastAndroid.LONG
        );
      },
      (error) => {
        this.setState({ error: error.message });
        console.log(error.message);
        ToastAndroid.show(`Error: ${error.message}`, ToastAndroid.LONG);
      }
    );
  };

  loadUpdatedLocations = () => {
    Backend.loadUpdatedLocation((location) => {
      const usersLocations = this.state.liveLocation.slice(0);
      usersLocations.forEach((element, index) => {
        if (element._id === location._id) {
          usersLocations.splice(index, 1, location);
          this.setState({
            usersLocations
          });
        }
      });
    });
  };

  loadNewLocations = () => {
    Backend.loadNewLocations((location) => {
      if (location.uid !== this.uniqueID) {
        this.setState(prevState => ({
          usersLocations: prevState.usersLocations.concat(location)
        }));
      }
    });
  };

  toggleSubView = () => {
    let color;
    let toValue = height - 65;
    if (this.state.isHidden && this.searchBar.isFocused()) {
      toValue = 0;
    }

    if (toValue > 0) {
      color = 'transparent';
    } else {
      color = '#F5FCFF';
    }

    Animated.spring(this.state.bounceValue, {
      toValue,
      speed: 10,
      bounciness: 0
    }).start();
    this.setState(prevState => ({
      isHidden: !prevState.isHidden,
      bgColor: color
    }));
  };

  handleBackPress = () => {
    if (!this.state.isHidden && this.searchBar.isFocused()) {
      this.toggleSubView();
      this.searchBar.blur();
      this.searchBar.clear();
      console.log('Search Bar Focused --> False');
      return true;
    }
    if (!this.state.isHidden && !this.searchBar.isFocused()) {
      this.toggleSubView();
      this.searchBar.clear();
      console.log('Search Bar Focused --> True');
      return true;
    }
    if (this.state.isHidden && !this.searchBar.isFocused()) {
      Alert.alert(
        'Close App!',
        'Are you sure?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Yes',
            onPress: () => {
              console.log('User pressed yes');
              BackHandler.exitApp();
            }
          }
        ],
        {
          cancelable: true
        }
      );
    }
    return true;
    // false means exit the app.
  };

  renderSeparator = () => (
    <View
      style={{
        height: 1,
        width: '86%',
        backgroundColor: '#CED0CE',
        marginLeft: '14%'
      }}
    />
  );

  renderAutoCompPrediction = ({ item }) => (
    <TouchableOpacity
      onPress={() => this.getGeoCode(item.place_id, item.description, item.main_text)
      }
    >
      <AutoCompleteFList
        description={item.description}
        id={item.id}
        place_id={item.place_id}
        main_text={item.main_text}
      />
    </TouchableOpacity>
  );

  render() {
    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={(ref) => {
            this.mapView = ref;
          }}
          provider="google"
          style={StyleSheet.absoluteFillObject}
          initialRegion={this.state.initialRegion}
          showsMyLocationButton
          showsUserLocation
          showsCompass
          loadingEnabled
          userLocationAnnotationTitle="You"
          // conditional attribute
          {...(this.state.region.latitude && this.state.region.longitude
            ? { region: this.state.region }
            : {})}
        >
          {this.state.searchedPlaceMarker.latitude
          && this.state.searchedPlaceMarker.longitude ? (
            <MapView.Marker
              coordinate={{
                latitude: this.state.searchedPlaceMarker.latitude,
                longitude: this.state.searchedPlaceMarker.longitude
              }}
              title={this.state.searchedPlaceMarker.title}
              description={this.state.searchedPlaceMarker.description}
            />
            ) : null}
        </MapView>
        <View
          style={{
            position: 'relative',
            backgroundColor: this.state.bgColor,
            height: 70,
            opacity: 1,
            justifyContent: 'center',
            alignContent: 'center'
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              borderRadius: 5,
              backgroundColor: 'white',
              marginHorizontal: '1%'
            }}
          >
            <TouchableOpacity style={{ alignSelf: 'center' }}>
              <Image
                style={{ height: 20, width: 20, alignSelf: 'center' }}
                source={require('./src/assets/images/menu.png')}
              />
            </TouchableOpacity>
            <TextInput
              ref={(ref) => {
                this.searchBar = ref;
              }}
              style={{
                width: '70%',
                marginRight: '2%',
                marginLeft: '7%',
                fontSize: 18,
                fontFamily: 'sans-serif'
              }}
              placeholder="Search here"
              onFocus={() => this.toggleSubView()}
              onChangeText={text => this.getAutoComplete(text)}
              underlineColorAndroid="transparent"
              value={this.state.searchText}
            />
            <TouchableOpacity style={{ alignSelf: 'center' }}>
              <Image
                style={{ height: 20, width: 20, alignSelf: 'center' }}
                source={require('./src/assets/images/microphone.png')}
              />
            </TouchableOpacity>
          </View>
        </View>
        <Fab
          direction="up"
          containerStyle={{}}
          style={{ backgroundColor: '#fff' }}
          position="bottomRight"
          onPress={() => this.findMe()}
        >
          <Icon
            type="MaterialIcons"
            name="my-location"
            style={{ color: 'black', fontSize: 30 }}
          />
        </Fab>
        <Animated.View
          style={[
            styles.subView,
            { transform: [{ translateY: this.state.bounceValue }] }
          ]}
        >
          <View style={styles.subViewChild}>
            <FlatList
              data={this.state.autoCompPredictions}
              renderItem={this.renderAutoCompPrediction}
              ItemSeparatorComponent={this.renderSeparator}
              keyExtractor={item => item.description}
              extraData={this.state.fListRefresh}
            />
          </View>
        </Animated.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  subView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5FCFF',
    height: '90%'
  },
  subViewChild: {
    flex: 1,
    justifyContent: 'space-evenly'
  }
});

/* <MapView.Marker
  coordinate={{
    latitude: {this.state.region.latitude ?
       this.state.region.latitude: this.state.initialRegion.latitude},
    longitude: {this.state.region.longitude ?
       this.state.region.longitude : this.state.initialRegion.longitude}
  }}
  title={"Your Location"}
/>

<MapView.Polyline
  coordinates={this.state.coords}
  strokeWidth={2}
  strokeColor="red"/> */

// <Modal
//     animationType="slide"
//     transparent={true}
//     visible={this.state.modalVisible}
//     onRequestClose={() => {
//       this.setModalVisible(!this.state.modalVisible);
//     }}
//     >
//       <View style={{backgroundColor: '#F5FCFF', marginTop: '18%', flex: 1}}>
//         <Text>Hello Modal</Text>
//       </View>
// </Modal>

// keyExtractor = (item, index) => {
//   Alert.alert(
//     "FlatList",
//     `${item} ${index}`,
//     [{ text: "OK", style: "cancel" }],
//     {
//       cancelable: true
//     }
//   );
// };
