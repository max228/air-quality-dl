const arg = require('arg')
const fs = require('fs');
const { default: fetch } = require('node-fetch');
const cliProgress = require('cli-progress');

function formatDate(date) {
  var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2)
    month = '0' + month;
  if (day.length < 2)
    day = '0' + day;

  return [year, month, day].join('-');
}

function countDays(date1, date2) {
  return Math.round(Math.abs((date1 - date2) / 86400000))
}


async function downloadRaw(bar, errorBar, sensor, sdate = '2019-11-05', edate = '2020-11-05') {
  const date1 = new Date(sdate)
  const date2 = new Date(edate)
  let startDate = date1
  let endDate = date2
  if (startDate < endDate)
    [startDate, endDate] = [endDate, startDate]
  // console.log(`starting downloading data for ${sensor.sensorID}.`);
  const mypath = `raw/${sensor.sensorID}-${sensor.sensorType}`
  if (!fs.existsSync(mypath))
    fs.mkdirSync('raw/' + sensor.sensorID + '-' + sensor.sensorType)
  for (let date = new Date(startDate); date > endDate; date.setDate(date.getDate() - 1)) {
    let errcount = 0
    const formattedDate = formatDate(date)
    const query = `https://archive.sensor.community/${formattedDate}/${formattedDate}_${sensor.sensorType.toLowerCase()}_sensor_${sensor.sensorID}.csv`
    // console.log(query);
    try {
      const writefilepath = `${mypath}/${formattedDate}.csv`
      if (!fs.existsSync(writefilepath)) {
        let payload = await fetch(query)
        if (payload.ok) {
          bar.increment()
          const mydata = await payload.text()
          fs.writeFileSync(
            writefilepath,
            mydata,
            { flag: 'a' }
          )
          // errcount = 0
          // console.log(`successfully downloaded data for date ${formattedDate}`)
        } else {
          errorBar.increment()
        }
      }
    }
    catch (err) {
      // console.log(err);
      // break
    }
  }
}


function dlAll(path, sdate, edate) {
  const data = fs.readFileSync(path)
  const sensors = JSON.parse(data)
  const days = countDays(new Date(sdate), new Date(edate))

  
  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    
  }, cliProgress.Presets.shades_grey);
  
  const bar = multibar.create(days * sensors.length, 0, {
    filename: 'ok-count'
  })
  const errorBar = multibar.create(days * sensors.length, 0, {
    filename: '404-count'
  })
  for (const sensor of sensors) {
    downloadRaw(bar, errorBar, sensor, sdate, edate)
  }
}

const args = arg({
  '--start': String,
  '--end': String,
  '--input': String,
  '-s': '--start',
  '-e': '--end',
  '-i': '--input'
})
if (args['--start'], args['--end'], args['--input']) {
  if (!fs.existsSync('raw'))
  fs.mkdirSync('raw')
  dlAll(args['--input'], args['--start'], args['--end'])
} else {
  console.log('In order to download data you have to provide 3 arguments');
  console.log('--start yyyy-mm-dd - start date of the search (-s short)');
  console.log('--end yyyy-mm-dd - end date of the search (-e short)');
  console.log('--input filename.json - input file that contains sensor data (-i short)');
}

