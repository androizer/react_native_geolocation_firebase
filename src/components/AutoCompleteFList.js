import React, { Component } from "react";

import { View, Text, StyleSheet } from "react-native";

export default class AutoCompleteFList extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <View style={styles.container}>
        <Text>{this.props.main_text}</Text>
        <Text>{this.props.description}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "flex-start",
    alignContent: "space-around"
  }
});
