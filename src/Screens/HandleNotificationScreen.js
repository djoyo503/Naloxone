import React, { Component } from 'react';
import { Text, View, StyleSheet, Button, AsyncStorage, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { Constants } from 'expo';
import { getInternalUserInfo } from '../Auth/fakeAuth.js';
import openGps from '../Networking/openGPS';

let keys = ['distressDistance', 'distressUserExpoToken', 'distressUserID'];

export default class HandleNotificationScreen extends Component {
    constructor() {
        super();
        this.state = {
          isLoading: true,
          distressDistance: null,
          distressUserExpoToken: null,
          distressUserID: null,
          distressUserLatlng: null,
        };
    }

    componentDidMount() {
        getInternalUserInfo("distressDistance")
        .then(distanceRes => {
            this.setState({distressDistance: distanceRes.replace(/"/g, "")});
            getInternalUserInfo("distressUserExpoToken")
            .then(userExpoTokenRes => {
                this.setState({distressUserExpoToken: userExpoTokenRes});
                getInternalUserInfo("distressUserID")
                .then(userIDRes => {
                    this.setState({distressUserID: userIDRes.replace(/"/g, "")});
                    getInternalUserInfo("distressUserLatlng")
                    .then(latlngRes => {
                        this.setState({distressUserLatlng: latlngRes.replace(/"/g, ""), isLoading: false});
                    })
                    .catch(err => console.log("can't find distress latlng in handling notification: " + err));
                })
                .catch(err => console.log("can't find distress distance in handling notification: " + err));    
            })
            .catch(err => console.log("can't find distress distance in handling notification: " + err));
        })
        .catch(err => console.log("can't find distress distance in handling notification: " + err));
    }

    render() {
        if (this.state.isLoading) {
            return(
              <View style={styles.container}>
                  <ActivityIndicator />
                  <StatusBar barStyle="default" />
              </View>
            );
          }

        return (
            <View style={styles.container}>
                <Text style={styles.paragraph}>
                    Test page for notification handling:{"\n"}
                    The distress call is {this.state.distressDistance} km away, Would you like to respond?
                </Text>
                <Button
                    title="Yes"
                    color="#db2828"
                    accessibilityLabel="Accept the distress call to provide Naloxone"
                    onPress={() => {
                        AsyncStorage.multiRemove(keys);
                        var userExpoToken = this.state.distressUserExpoToken;
                        var userID = this.state.distressUserID;
                        fetch('https://us-central1-naloxone-b5562.cloudfunctions.net/sendDistressConfirmation?userExpoToken='+userExpoToken+'&userID='+userID)
                        .then(res => {
                            console.log(res);
                            if(res.ok === true) {
                                Alert.alert(
                                    'Distress Call Confirmation',
                                    'A confirmation of the distress call has been send out to the user in distress.',
                                    [
                                        {text: 'OK', onPress: () => {
                                            console.log('OK pressed for distress confirmation.');
                                            let latlngResult = this.state.distressUserLatlng;
                                            latlngResult = latlngResult.split(",");
                                            openGps(latlngResult[0], latlngResult[1]);
                                            this.props.navigation.navigate("SignedIn");
                                        }},
                                    ],
                                    {cancelable: false}
                                );
                            } else {
                                Alert.alert(
                                    'Distress Call Confirmation',
                                    'Another Naloxone kit holder has already responded to the distress call.',
                                    [
                                        {text: 'OK', onPress: () => {
                                            console.log('OK pressed for distress confirmation.');
                                            this.props.navigation.navigate("SignedIn");
                                        }},
                                    ],
                                    {cancelable: false}
                                );
                            }
                        });
                    }}
                />
                <Button
                    title="No"
                    color="#3BB9FF"
                    accessibilityLabel="Decline the distress call to provide Naloxone"
                    onPress={() => {
                        AsyncStorage.multiRemove(keys)
                        .then(() => {
                            this.props.navigation.navigate("SignedIn");
                        })
                        .catch(err => console.log("Can't remove asyncStore in handleNotificationScreen: " + err));
                    }}
                />
            </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ecf0f1',
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#34495e',
  },
});
