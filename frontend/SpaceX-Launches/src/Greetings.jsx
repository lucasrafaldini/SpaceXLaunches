import React, { Component } from 'react';
import Howdy from './components/howdy';
import Navbar from './components/navbar';
import Footer from './components/footer';

class Greetings extends Component {
  render() {
    return (
      // JSX HERE !!!
      <div>
        <br></br>
        <br></br>
        <br></br>
        <Howdy />
        <br></br>
        <br></br>
        <br></br>
        <Footer />
      </div>
    );
  }
}

export default Greetings;
