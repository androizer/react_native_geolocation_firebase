import firebase from 'firebase';

class Backend {
  uid = '';

  locationRef = null;

  messageRef = null;

  // initialize firebase Backend
  constructor() {
    firebase.initializeApp({
      apiKey: 'AIzaSyB0s1cBycIsTlncHCrYabK6245eQRceqCg',
      authDomain: 'chatapp-7194.firebaseapp.com',
      databaseURL: 'https://chatapp-7194.firebaseio.com',
      storageBucket: 'chatapp-7194.appspot.com',
    });

    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('User', user.uid);
        this.setUid(user.uid);
      } else {
        firebase
          .auth()
          .signInAnonymously()
          .catch((error) => {
            console.log(error.message);
          });
      }
    });
  }

  setUid(value) {
    this.uid = value;
  }

  getUid() {
    return this.uid;
  }

  // retrieve the locations from the Backend
  loadNewLocations(callback) {
    this.locationRef = firebase.database().ref('locations');
    this.locationRef.off();
    const onReceive = (data) => {
      const location = data.val();
      callback({
        _id: data.key,
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        uid: location.uid
      });
    };
    this.locationRef.limitToLast(20).on('child_added', onReceive);
  }

  loadUpdatedLocation(callback) {
    const onReceive = (data) => {
      const location = data.val();
      callback({
        _id: data.key,
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      });
    };
    this.locationRef.limitToLast(20).on('child_changed', onReceive);
  }

  // send the location to the Backend.
  sendLocation(location, uniqueID) {
    this.locationRef.child(this.getUid().toString()).set({
      coords: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      uid: uniqueID
    });
  }

  // send the updated location to the Backend.
  updateLocation(location) {
    this.locationRef.child(`${location._id}/coords`).update({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  // send the messages to the Backend.
  loadNewMessages(callback) {
    this.messageRef = firebase.database().ref('chats');
    this.messageRef.off();
    const onReceive = (data) => {
      const message = data.val();
      callback({
        _id: data.key,
        text: message.text,
        createdAt: new Date(message.createdAt),
        user: {
          _id: message.user._id,
          name: message.user.name
        }
      });
    };
    this.messageRef.limitToLast(20).on('child_added', onReceive);
  }

  // close the connection to the Backend
  closeTracking() {
    if (this.locationRef) {
      this.locationRef.off();
    }
    if (this.messageRef) {
      this.messageRef.off();
    }
  }
}

export default new Backend();
