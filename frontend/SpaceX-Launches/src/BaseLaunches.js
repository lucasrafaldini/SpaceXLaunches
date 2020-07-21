import React, { Component } from 'react';
import NextLaunches from './components/nextLaunches';
import LastLaunches from './components/lastLaunches';
import Navbar from './components/navbar';
import Footer from './components/footer';

class BaseLaunches extends Component {
  state = {
    nextLaunches: [],
    lastLaunches: [],
  };
  componentDidMount() {
    fetch('http://127.0.0.1:8000/api/next_launches/')
      .then((res) => res.json())
      .then((data) => {
        this.setState({ nextLaunches: data.slice(0, 3) });
      })
      .catch(console.log);

    fetch('http://127.0.0.1:8000/api/last_launches/')
      .then((res) => res.json())
      .then((data) => {
        // console.log('Data =>', data)
        var lastIndex = Object.keys(data).length;
        this.setState({ lastLaunches: data.slice(lastIndex - 3, lastIndex) });
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
        <NextLaunches launches={this.state.nextLaunches} />
        <LastLaunches launches={this.state.lastLaunches} />
        <br></br>
        <br></br>
        <br></br>
        <Footer />
      </div>
    );
  }
}

export default BaseLaunches;
