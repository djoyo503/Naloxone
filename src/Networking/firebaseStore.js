import { AsyncStorage } from "react-native";
import * as firebase from 'firebase';
import {getInternalUserInfo} from '../Auth/fakeAuth.js';

export const newUserStoreData = (userid) => {
  firebase.database().ref('users/'+userid).set({
    kitHolder: false,
    kitNoti: false,
  });
  console.log("Welcome new user!");
};

export const loadPreferences = async (userid) => {
  let ref = await firebase.database().ref('users/'+userid+'/kitHolder');
  await ref.once("value", function(snapshot) {
   console.log("loading kit prefrences: " + snapshot.val());
   let kitValue = snapshot.val();
   if(kitValue !== null) {
    kitValue = kitValue.toString();
   } else {
     kitValue = 'false';
     firebase.database().ref('users/'+userid).update({
      kitHolder: false,
    });
    console.log("Missing kitHolder value in database, fixed");
   }
   console.log("storing kitHolder");
   AsyncStorage.setItem("kitHolder", kitValue);
  }, function (error) {
   console.log("Error: " + error.code);
  });

  let notiRef = await firebase.database().ref('users/'+userid+'/kitNoti');
  await notiRef.once("value", function(snapshot) {
   console.log("loading kit noti prefrences: " + snapshot.val());
   let NotiValue = snapshot.val();
   if(NotiValue !== null) {
    NotiValue = NotiValue.toString();
   } else {
     NotiValue = 'false';
     firebase.database().ref('users/'+userid).update({
      kitNoti: false,
    });
    console.log("Missing kitNoti value in database, fixed");
   }
   console.log("storing kit noti");
   AsyncStorage.setItem("kitNoti", NotiValue);
  }, function (error) {
   console.log("Error: " + error.code);
  });
};

//modulus to the nearest 0.01 and groups it by increments 0.01.
/*The whole point is to categorize kit holders by latlng, and 
then when there is a distress call, a function will explore
the latlng categories around them. */
latlngClassifier = (lat, lng) => {
  console.log("latlngClassifier starting..");
  lat = lat.toString();
  let latSplit = lat.split(".");
  latDec = latSplit[1];
  console.log(latSplit);

  lng = lng.toString();
  let lngSplit = lng.split(".");
  lngDec = lngSplit[1];
  console.log(lngSplit);

  let latCat = latDec.substr(0,2);
  let lngCat = lngDec.substr(0,2);

  let mylatCat = latSplit[0]+"."+latCat;
  let mylngCat = lngSplit[0]+"."+lngCat;
  console.log("latitude category: " + mylatCat);
  console.log("longitude category: " + mylngCat);

  let latPath = latSplit[0]+"o"+latCat;
  let lngPath = lngSplit[0]+"o"+lngCat;

  let latlng = mylatCat + ',' + mylngCat;
  let latlngPath = latPath + ',' + lngPath;
  return [latlng, latlngPath];
};

export const storeLocation = (kit, kitnoti) => {
  console.log("Storing location");
  navigator.geolocation.getCurrentPosition(
    position => {
      let lat = position.coords.latitude;
      let long = position.coords.longitude;
      let latlngArray = latlngClassifier(lat, long);
      let mylatlng = latlngArray[0];
      let latlngPath = latlngArray[1];
      getInternalUserInfo('userID')
      .then(res => {
        if(res !== null) {
          if(kit === true){
            latlngClassifier(lat, long);
            console.log("storing latlng");
            firebase.database().ref('users/'+res).update({
              kitHolder: kit,
              kitNoti: kitnoti,
              lat: lat,
              lng: long,
              latlng: mylatlng,
            });
            console.log("lat lng path: " + latlngPath);
            firebase.database().ref('latlng/'+latlngPath).update({
              [res]: kitnoti,
            });
            AsyncStorage.setItem("latlngPath", latlngPath);
            console.log(mylatlng);
          } else {
            console.log("not storing latlng");
            firebase.database().ref('users/'+res).update({
              kitHolder: kit,
              kitNoti: kitnoti,
            });
            firebase.database().ref('latlng/'+latlngPath).update({
              [res]: null,
            });
            AsyncStorage.removeItem('latlngPath');
          }
        } else {
          console.log("Can't find user");
        }
      })
      .catch(err => console.log("Can't get internal user; store location : " + err));
    },
    (error) => console.log(error.message),
    { enableHighAccuracy: true, timeout: 2000, maximumAge: 1000 },
  );
};

export const updateLatlng = (kit, kitnoti) => {
  let userID = null;
  getInternalUserInfo('userID')
    .then(res => {
      userID = res;
      if(res !== null) {
        console.log("updating kitNoti");
          firebase.database().ref('users/'+res).update({
            kitNoti: kitnoti,
        });
      }
    })
    .catch(err => console.log("Can't get internal user; updateLatlng: " + err));
  
  if(kit === true) {
    getInternalUserInfo('latlngPath')
      .then(res => {
        console.log("updatlatlng; latlngPath: " + res);
        firebase.database().ref('latlng/'+res).update({
          [userID]: kitnoti,
        });
      })
      .catch(err => console.log("Can't get interal latlng path: " + err));
  }
};