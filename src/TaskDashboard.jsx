import React, { Component } from 'react';
import { Row, Table, Collection } from 'react-materialize';
import TaskDashboardFields from './TaskDashboardFields.jsx'
import '../styles/App.css'

class TaskDashboard extends Component {
  render() {
    return (
      <Row>
        <Collection header="Task List">
        </Collection>

        <Table>

          <thead>
            <tr>
              <th data-field="Start Task">Start Task</th>
              <th data-field="Scheduled Start Time">Start Time</th>
              <th data-field="Description">Description</th>
              <th data-field="Scheduled End Time">End Time</th>
              <th data-field="End Task">End Task</th>
            </tr>
          </thead>

          <tbody>
            {
              this.props.listOfTasks.filter(({ projectId }) => projectId === this.props.selectedProject.id)
              .map((task) => {
                return <TaskDashboardFields
                  task={task}
                  handleStartTask={this.props.handleStartTask}
                  updateCompletedAndIncompleteTasks={this.props.updateCompletedAndIncompleteTasks}
                  clickedStart={this.props.clickedStart.indexOf(task.id) > -1}
                  clickedEnd={this.props.clickedEnd.indexOf(task.id) > -1}
                  key={task.id}
                />
              })
            }
          </tbody>

        </Table>
      </Row>
    );
  }
}

export default TaskDashboard;
