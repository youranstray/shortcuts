var dur_month = 1;

const startDate = new Date();
startDate.setMonth(startDate.getMonth() - dur_month);
console.log(`日历的开始时间 ${startDate.toLocaleDateString()}`);

const endDate = new Date();
endDate.setMonth(endDate.getMonth() + dur_month);
console.log(`日历的结束时间 ${endDate.toLocaleDateString()}`);

const reminders = await Reminder.allDueBetween(startDate, endDate);
console.log(`获取 ${reminders.length} 条提醒事项`);

var calendar = await Calendar?.forEvents();

//获取日历名和对应的日历
var m_dict = {};
for (cal of calendar) {
  m_dict[cal.title] = cal;
  //console.log(`日历:${cal.title}`)
}

const events = await CalendarEvent.between(startDate, endDate, calendar);
console.log(`获取 ${events.length} 条日历`);

var reminders_id_set = new Set(reminders.map((e) => e.identifier));
//删除日历里提醒事项删除的事项
events_created = events.filter(
  (e) => e.notes != null && e.notes.includes("[Reminder]")
);
for (let event of events_created) {
  //console.warn(event.notes)
  let reg = /(\[Reminder\])\s([A-Z0-9\-]*)/;
  let r = event.notes.match(reg);
  //if(r) console.log(r[2])
  if (!reminders_id_set.has(r[2])) {
    event.remove();
  }
}

for (const reminder of reminders) {
  //reminder的标识符
  const targetNote = `[Reminder] ${reminder.identifier}`;
  // const targetNote = `[Reminder]`;
  const [targetEvent] = events.filter(
    (e) => e.notes != null && e.notes.includes(targetNote)
  ); //过滤重复的reminder
  if (!m_dict[reminder.calendar.title]) {
    console.warn("找不到日历" + reminder.calendar.title);
    continue;
  }
  if (targetEvent) {
    //console.log(`找到已经创建的事项 ${reminder.title}`)
    updateEvent(targetEvent, reminder);
  } else {
    console.warn(`创建事项 ${reminder.title} 到 ${reminder.calendar.title}`);
    const newEvent = new CalendarEvent();
    newEvent.notes = targetNote + "\n" + (reminder.notes || '🈚️'); // 要加入备注
    updateEvent(newEvent, reminder);
  }
}

Script.complete();

function getFormattedPeriod(period) {
  period = period < 0 ? -period : period
  const days = Math.floor(period / 1000 / 3600 / 24)
  const hours = Math.floor((period / 1000 / 3600 / 24 - days) * 24)
  const minutes = Math.floor(((period / 1000 / 3600 / 24 - days) * 24 - hours) * 60)
  const seconds = (((period / 1000 / 3600 / 24 - days) * 24 - hours) * 60 - minutes) * 60
  const formattedPeriod = `${days || '0'}天${hours || '0'}小时${minutes || '0'}分钟${seconds.toFixed(0) || '0'}秒钟`
  return formattedPeriod
}

function randomNum(minNum,maxNum){
  switch(arguments.length){
    case 1:
      return parseInt(Math.random()*minNum+1,10);
      break;
    case 2:
      return parseInt(Math.random()*(maxNum-minNum+1)+minNum,10); 
      break;
    default:
      return 0;
      break;
  }
}

function getIcons(status, key) {
  if (!status) return ''
  const IconMap = {
    category: { // 提醒和日历中列表名称
      '家庭': `🏠`,
      '工作': `👩‍💻`,
      '考研': `🙇‍♀️`,
      '日常': `🔆`,
      '阅读': `📖`,
      '手绘': `🎨`,
      '练字': `✍️`,
      '运动': `🏃‍♀️`,
    },
    completed: ['🟢', '🥳', '👏', '😌', '🎉', '👌'],
    undued: ['🔴', '🌚', '😔', '🤪', '🙃', '🤦‍♀️'],
    ongoing: ['🟡', '🎏', '🌝', '💪', '👀', '🌈']
  }
  return IconMap[status][key]
}

function updateEvent(event, reminder) {
  event.title = `${reminder.title}`;
  cal_name = reminder.calendar.title;
  cal = m_dict[cal_name];
  event.calendar = cal;
  // event.notes = event.notes.includes('undefined') ? event.notes.replace('undefined', '🈚️') : event.notes
  //console.warn(event.calendar.title)
  //已完成事项
  if (reminder.isCompleted) {
    event.title = `${getIcons('completed', 0)}  ${getIcons('category', cal_name)}${reminder.title} ${getIcons('completed', randomNum(1, 5))}${getIcons('completed', randomNum(1, 5))}`;
    event.isAllDay = true;
    event.startDate = reminder.dueDate;
    // event.endDate=reminder.dueDate
    var ending = new Date(reminder.completionDate)
    // ending.setHours(ending.getHours()+1)
    event.endDate = ending
    if (Date.parse(reminder.dueDate) > Date.parse(reminder.completionDate)) {
      let starting = ending
      starting.setHours(starting.getHours() - 1)
      event.startDate = starting
    }

    // var period = (reminder.dueDate - reminder.completionDate) / 1000 / 3600 / 24;
    // period = period.toFixed(1);
    const period = reminder.dueDate - reminder.completionDate
    const formattedPeriod = getFormattedPeriod(period)

    if (period < 0) {
      event.location = " 延期" + formattedPeriod + "完成";
    } else if (period == 0) {
      event.location = " 准时完成";
    } else {
      event.location = " 提前" + formattedPeriod + "完成";
    }
  } else { // 未完成事项
    const nowtime = new Date();
    // var period = (reminder.dueDate - nowtime) / 1000 / 3600 / 24;
    // period = period.toFixed(1);
    //console.log(reminder.title+(period))
    const period = reminder.dueDate - nowtime
    const formattedPeriod = getFormattedPeriod(period)

    if (period < 0) {
      //待办顺延
      event.location = " 延期" + formattedPeriod;
      //如果不是在同一天,设置为全天事项
      if (reminder.dueDate.getDate() != nowtime.getDate()) {
        event.title = `${getIcons('undued', 0)}  ${getIcons('category', cal_name)}${reminder.title} ${getIcons('undued', randomNum(1, 5))}${getIcons('undued', randomNum(1, 5))}`;
        event.startDate = nowtime;
        event.endDate = nowtime;
        event.isAllDay = true;
      } else { // 在同一天的保持原来的时间
        event.title = `${getIcons('ongoing', 0)}  ${getIcons('category', cal_name)}${reminder.title} ${getIcons('ongoing', randomNum(1, 5))}${getIcons('ongoing', randomNum(1, 5))}`;
        event.isAllDay = false;
        event.startDate = reminder.dueDate;
        var ending = new Date(reminder.dueDate);
        ending.setHours(ending.getHours() + 1);
        event.endDate = ending;
      }
      console.log(`【${reminder.title}】待办顺延${formattedPeriod}`);
    } else {
      event.title = `${getIcons('ongoing', 0)}  ${getIcons('category', cal_name)}${reminder.title} ${getIcons('ongoing', randomNum(1, 5))}${getIcons('ongoing', randomNum(1, 5))}`;
      event.isAllDay = false;
      event.location = " 还剩" + formattedPeriod
      event.startDate = reminder.dueDate;
      var ending = new Date(reminder.dueDate);
      ending.setHours(ending.getHours() + 1);
      event.endDate = ending;
    }
  }
  if (!reminder.dueDateIncludesTime) event.isAllDay = true;
  console.log(event)
  event && event.save();
}