import React, { Component } from 'react';
import NextLaunches from './components/nextLaunches';
import Navbar from './components/navbar';
import Footer from './components/footer';

class BaseAllNext extends Component {
  state = {
    nextLaunches: [],
  }
  componentDidMount() {
    fetch('http://127.0.0.1:8000/api/next_launches/')
    .then( res => res.json())
    .then((data) => {
      this.setState({ nextLaunches: data})
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
      <NextLaunches launches={this.state.nextLaunches} />
      <br></br>
      <br></br>
      <br></br>
      <Footer />
      </div>
    );
  }
}

export default BaseAllNext;