import React, { Component } from 'react';
import LastLaunches from './components/lastLaunches';
import Navbar from './components/navbar';
import Footer from './components/footer';

class BaseAllLast extends Component {
  state = {
    lastLaunches: [],
  }
  componentDidMount() {
    fetch('http://127.0.0.1:8000/api/last_launches/')
    .then( res => res.json())
    .then((data) => {
      // console.log('Data =>', data)
      this.setState({ lastLaunches: data})
    })
    .catch(console.log)
  }
  render() {
    return (
      // JSX HERE !!!
      <div>
      <Navbar />
      <br></br>
      <br></br>
      <br></br>
      <LastLaunches launches={this.state.lastLaunches} />
      <br></br>
      <br></br>
      <br></br>
      <Footer />
      </div>
    );
  }
}

export default BaseAllLast;