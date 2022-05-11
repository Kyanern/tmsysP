let taskslist = ['api/v1/tasks/list', '(GET) Returns a list of tasks, optionally filtered by task state. Only apps that the user has permissions for will have their tasks returned.'];
let taskscreate = ['api/v1/tasks/create', '(POST) Create a new task.'];
let taskspromotedoingtodone = ['api/v1/tasks/promote/doing_to_done', '(POST) Promote a task from [doing] state to [done] state.'];

let v1list = [
  taskslist,
  taskscreate,
  taskspromotedoingtodone
]

module.exports = {
  APIList: v1list
};