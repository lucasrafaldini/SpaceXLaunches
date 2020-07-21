#

# SpaceXLaunches

> A clean webpage to check launches by Space X.

[![Build Status](http://img.shields.io/travis/badges/badgerbadgerbadger.svg?style=flat-square)](https://travis-ci.org/badges/badgerbadgerbadger)

## Table of Contents

- [Installation](#installation)
- [License](#license)

---

## Installation

- The project runs with Django as Backend and React as Frontend so if you're trying to run an example, you will need to run both of they. You can check how it is done at [Setup](#setup)

### Clone

- Clone this repo to your local machine using `https://github.com/lucasrafaldini/SpaceXLaunches`

### Setup

- First of all, we need to run the backend:

> Go inside 'backend' folder and create a new virtual environment for python to work isolated and properly. After that, activate it:

```shell
$ sudo virtualenv .spacexenv
$ source .spacexenv/bin/activate
```

> Now install all libraries needed to run it using pip and 'requirements.txt':

```shell
$ pip install -r requirements.txt
```

> Everything should run smoothly so you can run it and test it's endpoints:

```shell
$ python manage.py runserver
```

> To be sure it is running, test the following endpoints (you can test it even at your browser):

```shell
localhost:8000/api/all_launches
localhost:8000/api/next_launch
localhost:8000/api/last_launch
localhost:8000/api/next_launches
localhost:8000/api/last_launches
```

- Now it's time to run our frontend:

> Go inside 'frontend/SpaceX-Launches/' folder and start npm:

```shell
$ npm start
```

> If you are finding some issues at this point, remember to start your npm project and install all its dependencies:

```shell
$ npm init
$ npm install
```

> Everything should run smoothly by then, so you can text its pages:

```shell
localhost:3000/
localhost:3000/launches
localhost:3000/launch
localhost:3000/next-launches
localhost:3000/last-launches
```

---

## Contributing

> Feel free to contribute, but before you get to work, take a look at our issues to make sure you are not goingo to do something someone else is already doing. Feel free to add some issues if you find any bug or if you think I should add some funcionality.

> To start coding this project follow these steps:

### Step 1

- **Option 1**

  - 🍴 Fork this repo!

- **Option 2**
  - 👯 Clone this repo to your local machine using `https://github.com/joanaz/HireDot2.git`

### Step 2

- **CODE LIKE THERE'S NO TOMORROW!** 🔨🔨🔨

### Step 3

- 🔃 Create a new pull request using <a href="https://github.com/lucasrafaldini/SpaceXLaunches/compare/" target="_blank">`https://github.com/lucasrafaldini/SpaceXLaunches/compare/`</a>.

---

### TO-DO's

- [ ] Tests
- [ ] Docker Image
- [ ] Isolate CSS
- [ ] Make a cache database
- [ ] Put a queue system between backend and SpaceX API

---

## License

[![License](http://img.shields.io/:license-mit-blue.svg?style=flat-square)](http://badges.mit-license.org)

- **[MIT license](http://opensource.org/licenses/mit-license.php)**
