import React, { Component } from 'react';
// import './App.css';
import Auth0Lock from 'auth0-lock'
import TaskDashboard from './TaskDashboard.jsx'
import Alert from 'react-s-alert';
import 'react-s-alert/dist/s-alert-default.css';
import 'react-s-alert/dist/s-alert-css-effects/genie.css';

class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      allTasks: [],
      clickedStartButton : [],
      clickedEndButton : [],
      progress_bar: []
   }
  }
  
  componentWillMount = () => {
    console.log("componentWillMount <App />");
    this.lock = new Auth0Lock('TejTiGWUQtFqn8hCNABYJ1KREwuDwyat', 'bfcsiqueira.auth0.com', {
      theme: {
        primaryColor: '#26e'
      },
      languageDictionary: {
        title: 'Authenticate'
      },
      closable: false,
      additionalSignUpFields: [{
        name: "given_name",
        placeholder: "Enter your first name",
        // icon: "https://example.com/name_icon.png",
        validator: (value) => {
          return value.length > 1
        }
      },{
        name: "family_name",
        placeholder: "Enter your last name",
        // icon: "https://example.com/name_icon.png",
        validator: (value) => {
          return value.length > 1
        }
      }]
    });

    this.lock.on("authenticated", (authResult) => {
      localStorage.setItem("accessToken", authResult.accessToken);
      this.lock.getProfile(authResult.idToken, (err, profile) => {
        if (err) {
          console.log("Error loading the Profile", err);
          return;
        }
        localStorage.setItem("profile", JSON.stringify(profile));
        this.setState({profile: profile});
        this.handleLogin()
      });
    });
  }

  showLock = () => {
    // Show the Auth0Lock widget
    this.lock.show();
  }

  logout = () => {
    this.setState({profile: undefined})
    localStorage.removeItem("profile")
    // this.showLock()
  }

  handleLogin = () => {
    const loginObj = {type: 'auth0-login', email:this.state.profile.email, first_name: this.state.profile.given_name, last_name: this.state.profile.family_name}
    this.socket.send(JSON.stringify(loginObj))
  }

  checkStartTime = () => {
    const { allTasks = [] } = this.state;
    const startTime = allTasks.filter((task) => task.start_time !== null);
    startTime.forEach((e) => {
      this.setState({ clickedStartButton: [...this.state.clickedStartButton, e.id] });
    })
  }

  checkEndTime = () => {
    const { allTasks = [] } = this.state;
    const endTime = allTasks.filter((task) => task.end_time !== null);
    endTime.forEach((e) => {
      this.setState({ clickedEndButton: [...this.state.clickedEndButton, e.id] });
    })
  }

  componentDidMount(){
    setTimeout(() => {
      if (!localStorage.profile) {
        // this.showLock();
      } else {
        const storageProfile = JSON.parse(localStorage.profile)
        this.setState({profile: storageProfile})
      }
    }, 800)

    this.socket = new WebSocket("ws://172.46.3.133:3001");
    this.socket.onopen = () => {
      console.log('Connected to server!');
      this.socket.send(JSON.stringify({type: 'request-tasks-and-users'})) 
      setTimeout(() => {
        this.socket.send(JSON.stringify({email: this.state.profile.email, type: 'askingForUserTasks'}))                                          
      }, 1200)
      
    }
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch(data.type){
        case "start-time-button-clicked":
          this.checkStartTime();
          this.setState({ clickedStartButton: [...this.state.clickedStartButton, +data.id] });
          break;

        case "end-time-button-clicked":
          this.checkEndTime();
          this.setState({ clickedEndButton: [...this.state.clickedEndButton, +data.id] });
          break;

        case "task-list-for-user":
          this.setState({allTasks: data.tasks})
          this.checkStartTime();
          this.checkEndTime(); 
          break;
        case "update-progress-bar":
          break;
        case "progress-bar-update":
             let task = data.tasks.filter((t) => {
              return t.id;
          });

          let user = data.users.filter((u) => {
            return u.id;
          });

          let progress_bar = {};

          task.forEach((t) => {
            let key = t.userId + '/' + t.projectId;
            if (progress_bar[key])  {
              progress_bar[key].total_tasks += 1;
            } else {
              progress_bar[key] = {};
              progress_bar[key].total_tasks = 1;
              progress_bar[key].userId = t.userId;
              progress_bar[key].projectId = t.projectId;
              user.forEach((u) => {
                if (t.userId === u.id) {
                  progress_bar[key].name = u.first_name;
                }
              })

              if (progress_bar[key].incomplete_tasks === undefined) {
                progress_bar[key].incomplete_tasks = 100;
                progress_bar[key].completed_tasks = 0;
              } else {
                progress_bar[key].incomplete_tasks = this.state[t.userId].incomplete_tasks;
                progress_bar[key].completed_tasks = this.state[t.userId].completed_tasks;
              }
            }
          })

          // just gets the values the progress_bar map
          const pBar = Object.keys(progress_bar).map(key => progress_bar[key]);

          let newProgressBarState = {
            progress_bar: pBar
          }

          this.setState(newProgressBarState);
          break;
        case "allTasks":
          break;
        default:
          console.log(data)
          console.error('Failed to send back');
      }
    }
  }

  handleStartTask = (e) => {
    e.preventDefault();

    console.log('task id', e.target.value)

    let message = {
      type: 'start-time-for-contractor-tasks',
      start_time: new Date(),
      id: +e.target.value,
      progress_bar: this.state.progress_bar,
      disabledStartButton: this.state.disabledStartButton
    }
    console.log('start task button pressed');
    this.socket.send(JSON.stringify(message));
  }

  updateProgressBarsonPageLoad = (taskIds) => {
    const newProgressBar = this.state.progress_bar.slice();
    let { progress_bar = [], allTasks = [], clickedStartButton = [] } = this.state;
    taskIds.forEach((taskId)=>{
      const targetId = +taskId;
      // retaining the previous update in progress_bar, which references newProgressBar, so that the state is retained for the next time around, thus survives the page refresh 
      let progress_bar = newProgressBar
      const targetTask = allTasks.find((task) => task.id === targetId);
      const targetUserId = targetTask.userId
      const targetProjectId = targetTask.projectId
      const buttonClicked = clickedStartButton.find((id) => id === targetId);

      if (buttonClicked !== targetId) {
        // console.error("You must begin a task before you can end it!");
        // Alert.error("You must begin a task before you can end it!");
      } else {

        const userProgress = progress_bar
          .filter((v) => v)
          .filter(({ userId }) => {
            return userId === targetUserId 
          })
          .find(({ projectId }) => {
            return projectId === targetProjectId;
          })
        // .find(({ projectId }) => projectId === targetUserId);

        if (progress_bar.find(({ userId }) => userId === +targetUserId)) {

          const progIdx = progress_bar.indexOf(userProgress);

          const taskStart = allTasks.find(({ userId }) => userId === targetUserId);

          const percentOfTasksToChange = 100 / userProgress.total_tasks;

          newProgressBar[progIdx] = {
            ...userProgress,
            completed_tasks: Math.min(100, userProgress.completed_tasks + percentOfTasksToChange),
            incomplete_tasks: Math.max(0, userProgress.incomplete_tasks - percentOfTasksToChange),
          };
        }
      }
    })
    console.log(newProgressBar)
    this.socket.send(JSON.stringify({
      type: 'new-pb-state',
      progress_bar: newProgressBar
    }));
    console.log('wills progress bar', newProgressBar);
    // this.setState({progress_bar: newProgressBar})
    // this.setState(Object.assign({},this.state,{progress_bar: newProgressBar}));
  }

 updateCompletedAndIncompleteTasks = ({ target: { value } }) => {
   
    const targetId = +value;
    const { progress_bar = [], allTasks = [], clickedStartButton = [] } = this.state;

      const targetTask = allTasks.find((task) => task.id === targetId);
      const targetUserId = targetTask.userId
      const targetProjectId = targetTask.projectId
      const buttonClicked = clickedStartButton.find((id) => id === targetId);

      if (buttonClicked !== targetId) {
        console.error("You must begin a task before you can end it!");
        Alert.error("You must begin a task before you can end it!");
      } else {
      // debugger;
      const userProgress = progress_bar
        .filter((v) => v)
        .filter(({ userId }) => {
          return userId === targetUserId 
        })
        .find(({ projectId }) => {
          return projectId === targetProjectId;
        })
        // .find(({ projectId }) => projectId === targetUserId)

      // if (progress_bar.find(({ userId }) => userId === +targetUserId)) {

      //   const progIdx = progress_bar.indexOf(userProgress);

      //   const taskStart = allTasks.find(({ userId }) => userId === targetUserId);

      //   const percentOfTasksToChange = 100 / userProgress.total_tasks;

      //   const newProgressBar = progress_bar.slice();
      //   newProgressBar[progIdx] = {
      //     ...userProgress,
      //     completed_tasks: Math.min(100, userProgress.completed_tasks + percentOfTasksToChange),
      //     incomplete_tasks: Math.max(0, userProgress.incomplete_tasks - percentOfTasksToChange),
        };
        console.log('activated update progress bar')
        // console.log('my new progress bar', newProgressBar)
        this.socket.send(JSON.stringify({
          type: 'end-time-for-contractor-tasks-and-updating-progress-bar',
          // progress_bar: newProgressBar,
          end_time: new Date(),
          id: targetId,
          disabledEndButton: this.state.disabledEndButton
        }));
    // }
  // }
  }

//   componentDidUpdate(previousProps, previousState) {
//     // if(previousState.eventCreation.timelineData.length !== this.state.eventCreation.timelineData.length){
//     //   // console.log('detected timeline updated')
//     //   this.clearTaskFields();
//     // }
//     if (previousState.clickedEndButton.length !== this.state.clickedEndButton.length && this.state.updatedProgressBar !== 1 ){
//       let onlyEndDateTasks = this.state.allTasks.filter((task) => task.end_date !== null ).map((task)=> task.id)
//       this.updateProgressBarsonPageLoad(onlyEndDateTasks)
//       this.setState({updatedProgressBar: 1})
//     }
//   }

  render() {
    return (
      <div>
        <nav className="nav-extended light-blue lighten-1">
          <div className="nav-wrapper">
            <a href="#!" className="brand-logo left"><i className="large material-icons">av_timer</i>EMPADA</a>
          </div>
          {/*<div className="App">
            <div className="App-header">
              <h2>Welcome to EMPADA</h2>
            </div>
          </div>*/}
        </nav>
          {this.state.profile &&
          <TaskDashboard
              userEmail={this.state.profile.email}
              handleStartTask={this.handleStartTask}
              listOfTasks={this.state.allTasks}
              updateCompletedAndIncompleteTasks={this.updateCompletedAndIncompleteTasks}
              clickedStart={this.state.clickedStartButton}
              clickedEnd={this.state.clickedEndButton}
            />
          }
      </div>
    );
  }
}

export default App;
