import React, { Component } from 'react';
import NextLaunch from './components/nextLaunch';
import LastLaunch from './components/lastLaunch';
import Navbar from './components/navbar';
import Footer from './components/footer';

class BaseLaunch extends Component {
  state = {
    nextLaunch: [],
    lastLaunch: [],
  };
  componentDidMount() {
    fetch('http://127.0.0.1:8000/api/next_launch/')
      .then((res) => res.json())
      .then((data) => {
        data = new Array(data);
        // console.log('Next Launch =>', data)
        this.setState({ nextLaunch: data });
      })
      .catch(console.log);

    fetch('http://127.0.0.1:8000/api/last_launch/')
      .then((res) => res.json())
      .then((data) => {
        data = new Array(data);
        //   console.log('Last Launch =>', data)
        this.setState({ lastLaunch: data });
      })
      .catch(console.log);
  }
  render() {
    return (
      // JSX HERE !!!
      <div>
        <br></br>
        <br></br>
        <br></br>
        <NextLaunch launch={this.state.nextLaunch} />
        <LastLaunch launch={this.state.lastLaunch} />
        <br></br>
        <br></br>
        <br></br>
        <Footer />
      </div>
    );
  }
}

export default BaseLaunch;
