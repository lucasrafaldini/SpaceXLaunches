import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import BaseLaunches from './BaseLaunches.jsx';
import BaseLaunch from './BaseLaunch.jsx';
import BaseAllNext from './BaseAllNext.jsx';
import BaseAllLast from './BaseAllLast.jsx';
import Greetings from './Greetings.jsx';
import Navbar from './components/navbar'
import * as serviceWorker from './serviceWorker';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

ReactDOM.render(
    <>
        <Navbar />
        <BrowserRouter>
            <Switch>
                <Route path="/" exact={true} component={Greetings} />
                <Route path="/launches" exact={true} component={BaseLaunches} />
                <Route path="/launch" exact={true} component={BaseLaunch} />
                <Route path="/next-launches" exact={true} component={BaseAllNext} />
                <Route path="/last-launches" exact={true} component={BaseAllLast} />
            </Switch>
        </BrowserRouter>
    </>
    , document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
