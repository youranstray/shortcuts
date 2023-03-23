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
console.log(`获取 ${events.length} 条日历事件`);

// 非提醒的日历事件
const no_reminder_events = events.filter(e => !reminders.find(r => e.notes?.includes(r.identifier)))
console.log(`非提醒事项的其他日历事件: ${no_reminder_events.length} 条`)
// console.log(no_reminder_events)

// 当手机端和iPad同时都添加了自动化，并且Reminder和Calendar设置了iCloud同步
// 容易生成重复的Reminder日历事件，其实日历事件并不是同一个，需删除一条
// 或者只在某一个终端上进行自动化，其他终端通过iCloud同步数据即可
const repeated_reminders = reminders.filter(r => events.filter(e => e.notes?.includes(r.identifier)).length > 1)
console.log(`重复的提醒事项: ${repeated_reminders.length} 条`)
// console.log(repeated_reminders)
const repeated_events = repeated_reminders.map(reminder => events.filter(e => e.notes?.includes(reminder?.identifier))).flat()
// console.log(repeated_events)
for (let i in repeated_events) {
  // 删除重复添加的Reminder日历事件
  const event = repeated_events[i]
  const index = events.findIndex(e => e.identifier === event.identifier)
  events.splice(index, 1);
  event.remove()
}
console.log(`删除重复数据后的日历事件: ${events.length} 条`);
// console.log(events);

var reminders_id_set = new Set(reminders.map((e) => e.identifier));

//删除日历里提醒事项删除的事项
events_created = events.filter(
  (e) => e.notes?.includes("[Reminder]")
);

for (let event of events_created) {
  //console.warn(event.notes)
  let reg = /(\[Reminder\])\s([A-Z0-9\-]*)/;
  let r = event.notes.match(reg);
  //if(r) console.log(r[2])
  if (!reminders_id_set.has(r[2])) {
    const index = events.findIndex(e => e.identifier === event.identifier)
    events.splice(index, 1);
    event.remove();
  }
}

for (const reminder of reminders) {
  //reminder的标识符
  const targetNote = `[Reminder] ${reminder.identifier}`;
  const [targetEvent] = events.filter(
    (e) => e.notes?.includes(reminder.identifier)
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
  // const seconds = (((period / 1000 / 3600 / 24 - days) * 24 - hours) * 60 - minutes) * 60
  const formattedPeriod = `${days || '0'}天${hours || '0'}小时${minutes || '0'}分钟` // ${seconds.toFixed(0) || '0'}秒钟
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
  return key || key === 0 ? IconMap[status][key] : IconMap[status]
}

function updateEvent(event, reminder) {
  event.title = event.title || `${reminder.title}`
  // console.log(event.title);
  cal_name = reminder.calendar.title;
  cal = m_dict[cal_name];
  event.calendar = cal;
  // event.notes = event.notes.includes('undefined') ? event.notes.replace('undefined', '🈚️') : event.notes
  //console.warn(event.calendar.title)

	const categoryIcon = getIcons('category', cal_name)
	let [statusIcon, ...rest] = event.title.split(' ')
  let [commonIcons] = rest.slice(-1)
  //console.log(`init: ${statusIcon}; ${categoryIcon}; ${commonIcons}`);
  
  //已完成事项
  if (reminder.isCompleted) {
    statusIcon = getIcons('completed', 0).includes(statusIcon) ? statusIcon : getIcons('completed', 0)
    commonIcons = getIcons('completed', 0).includes(statusIcon) && commonIcons.split('').filter(c => getIcons('completed').join('').split('').includes(c)).length === commonIcons.split('').length ? commonIcons : `${getIcons('completed', randomNum(1, 5))}${getIcons('completed', randomNum(1, 5))}`
		//console.log(`updated: ${statusIcon}; ${categoryIcon}; ${commonIcons}`)
    //console.log('')
    
    event.title = `${statusIcon}  ${categoryIcon}${reminder.title} ${commonIcons}`;
    event.isAllDay = false;
    event.startDate = reminder.dueDate;
    // event.endDate=reminder.dueDate
    var ending = new Date(reminder.completionDate)
    // ending.setHours(ending.getHours()+1)
    event.endDate = ending
    
    // 提前完成的事项
    if (Date.parse(reminder.dueDate) > Date.parse(reminder.completionDate)) {
      let starting = ending
      starting.setHours(starting.getHours() - 1)
      event.startDate = starting
    }
    
    // 由于个人一些原因2023-03-15前完成的事项需特殊处理
    if (reminder.completionDate < new Date('2023-03-15')) {
      ending = reminder.dueDate
      ending.setHours(ending.getHours() + 1)
      event.endDate = ending
    }

    // var period = (reminder.dueDate - reminder.completionDate) / 1000 / 3600 / 24;
    // period = period.toFixed(1);
    const period = reminder.dueDate - reminder.completionDate
    const formattedPeriod = getFormattedPeriod(period)

    if (period < -60000) {
      event.location = " 用时 " + formattedPeriod + " 完成";
    } else if (period / 1000 / 60 < 1) {
      event.location = " 准时完成";
    } else {
      event.location = " 提前 " + formattedPeriod + " 完成";
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
      statusIcon = getIcons('undued', 0).includes(statusIcon) ? statusIcon : getIcons('undued', 0)
      commonIcons = getIcons('undued', 0).includes(statusIcon) && commonIcons.split('').filter(c => getIcons('undued').join('').split('').includes(c)).length === commonIcons.split('').length ? commonIcons : `${getIcons('undued', randomNum(1, 5))}${getIcons('undued', randomNum(1, 5))}` //  && commonIcons.filter(c => getIcons('undued').includes(c))?.length === commonIcons.length
      // console.log(`updated: ${statusIcon}; ${categoryIcon}; ${commonIcons}`)
      // console.log('')
      
      //如果不是在同一天,设置为全天事项
      if (reminder.dueDate.getDate() != nowtime.getDate()) {
        event.location = " 延期 " + formattedPeriod;
        event.title = `${statusIcon}  ${categoryIcon}${reminder.title} ${commonIcons}`;
        event.startDate = nowtime;
        event.endDate = nowtime;
        event.isAllDay = true;
      } else { // 在同一天的保持原来的时间
				event.location = " 已开始 " + formattedPeriod;
        event.title = `${statusIcon}  ${categoryIcon}${reminder.title} ${commonIcons}`;
        event.isAllDay = false;
        event.startDate = reminder.dueDate;
        var ending = new Date(reminder.dueDate);
        ending.setHours(ending.getHours() + 1);
        event.endDate = ending;
      }
      console.log(`【${reminder.title}】待办顺延${formattedPeriod}`);
    } else {
      statusIcon = getIcons('ongoing', 0).includes(statusIcon) ? statusIcon : getIcons('ongoing', 0)
      commonIcons = getIcons('ongoing', 0).includes(statusIcon) && commonIcons.split('').filter(c => getIcons('ongoing').join('').split('').includes(c)).length === commonIcons.split('').length ? commonIcons : `${getIcons('ongoing', randomNum(1, 5))}${getIcons('ongoing', randomNum(1, 5))}` // && commonIcons.filter(c => getIcons('ongoing').includes(c))?.length === commonIcons.length
      // console.log(`updated: ${statusIcon}; ${categoryIcon}; ${commonIcons}`)
      // console.log('')
      
      event.title = `${statusIcon}  ${categoryIcon}${reminder.title} ${commonIcons}`;
      event.isAllDay = false;
      event.location = " 距离开始还剩 " + formattedPeriod
      event.startDate = reminder.dueDate;
      var ending = new Date(reminder.dueDate);
      ending.setHours(ending.getHours() + 1);
      event.endDate = ending;
    }
  }
  if (!reminder.dueDateIncludesTime) event.isAllDay = true;
  event.save && event.save();
}