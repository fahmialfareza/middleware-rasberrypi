$(document).ready(function () {

    let lastTime = 0;
    let dataCpu = []
    let dataMem = []
    let TICKINTERVAL = 3000
    let XAXISRANGE = 60000

    window.Apex = {
        chart: {
            height: 300,
            animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
            toolbar: { show: true },
            zoom: { enabled: false },
        },
        dataLabels: { enabled: false },
        stroke: {
            curve: 'straight',
            width: 4,
        },
        xaxis: {
            range: XAXISRANGE,
        },
        yaxis: {
            decimalsInFloat: 2,
            opposite: true,
        },
        tooltip: {
            x: {
                format: 'HH:mm:ss'
            }
        },
        legend: {
            show: true,
            floating: true,
            horizontalAlign: 'left',
            onItemClick: {
                toggleDataSeries: false
            },
            position: 'top',
        },
    }

    function setInitial(baseval) {
        let x = baseval;
        let y = 0
    
        dataCpu.push({
            x, y
        });
        dataMem.push({
            x, y
        });
    
        lastTime = baseval
        baseval += TICKINTERVAL;
    }
    
    setInitial(new Date().getTime())

    function getNewSeries(baseval, datanya) {
        let newTime = baseval + TICKINTERVAL;
        lastTime = newTime;
        for (let i = 0; i < dataCpu.length - 60; i++) {
            // IMPORTANT
            // we reset the x and y of the data which is out of drawing area
            // to prevent memory leaks
            dataCpu[i].x = newTime - XAXISRANGE - TICKINTERVAL
            dataCpu[i].y = 0
            dataMem[i].x = newTime - XAXISRANGE - TICKINTERVAL
            dataMem[i].y = 0
        }
        dataCpu.push({
            x: newTime,
            y: datanya.osutils.cpuUsage
        })
        dataMem.push({
            x: newTime,
            y: datanya.osutils.memTotal - datanya.osutils.memFree
        })
    }

    let optionsCpu = {
        chart: { type: 'line' },
        title: { text: 'CPU Usage', align: 'left', style: { fontSize: '12px' } },
        series: [{ name: "CPU Usage", data: dataCpu }],
        xaxis: { title: { text: 'Time' }, type: 'datetime' },
        yaxis: { title: { text: "CPU Usage in %" }, },
    }
    
    let optionsMemory = {
        chart: { type: 'line' },
        title: { text: 'Memory Usage', align: 'left', style: { fontSize: '12px' } },
        series: [{ name: "Memory Usage", data: dataMem }],
        xaxis: { title: { text: 'Time' }, type: 'datetime' },
        yaxis: { title: { text: "Memory Usage in MB" }, },
    }
    
    let chartCpu = new ApexCharts(
        document.querySelector("#chartCpu"),
        optionsCpu
    );
    chartCpu.render();
    
    let chartMem = new ApexCharts(
        document.querySelector("#chartMem"),
        optionsMemory
    );
    chartMem.render();

    let to;
    let interval = 4;
    let refresh = function () {
        $.ajax({
            url: '/api/osutils',
            dataType: 'json',
            cache: false,
            error: function (request, error) {
                alert("Can't do because: " + error);
                clearTimeout(to);
            },
            success: function (reply) {
                handleViewOs(reply);
                getNewSeries(lastTime, reply)
                chartCpu.updateSeries([{
                    data: dataCpu
                }])
                chartMem.updateSeries([{
                    data: dataMem
                }])
            }
        })
    }

    function handleViewOs(reply) {
        $('#platform').html(reply.osutils.platform)
        $('#uptime').html(reply.osutils.uptime + ' ms')
        $('#cpus').html(reply.osutils.cpus)
        $('#cpu-usage').html(reply.osutils.cpuUsage + ' %')
        $('#cpu-free').html(reply.osutils.cpuFree + ' %')
        $('#total-memory').html(parseFloat(reply.osutils.memTotal).toFixed(2) + ' MB')
        $('#used-memory').html((parseFloat(reply.osutils.memTotal).toFixed(2) - parseFloat(reply.osutils.memFree).toFixed(2)).toFixed(2) + ' MB')
        $('#free-memory').html(parseFloat(reply.osutils.memFree).toFixed(2) + ' MB')
    }

    (function countdown(remaining) {
        if (remaining === 1) {
            refresh()
        }
        if (remaining === -1) {
            //location.reload(true)
            remaining = interval
            $('#osutils').fadeOut(100);
        }
        $('#osutils').fadeIn(100);
        document.getElementById('countdown').innerHTML = 'Refreshing in ' + remaining + ' seconds';
        to = setTimeout(function () { countdown(remaining - 1); }, 1000);
    })(interval);

    // delete unnecessary buttons 
    $('#btn-things').remove()
    $('#btn-things').remove()
    $('#btn-add-things').remove()
    $('#btn-dashboard').remove()

    $('#btn-sysutils').addClass('active')

    // actions button
    $('#btn-account').click(function () { window.location.href = '/account'; });
    $('#btn-print').click(function () { window.location.href = '/print'; });
    $('#btn-dashboard').click(function () { window.location.href = '/dashboard'; });
    $('#btn-logout').click(function () { 
        $.ajax({
            url: '/logout',
            type: 'POST',
            data: { logout: true },
            success: function (data) {
                $('.modal-alert').modal({ show: false, keyboard: false, backdrop: 'static' });
                $('.modal-alert .modal-header h4').text('Success!');
                $('.modal-alert .modal-body p').html('You are now logged out.<br>Redirecting you back to the homepage.');
                $('.modal-alert').modal('show');
                $('.modal-alert button').click(function () { window.location.href = '/'; })
                setTimeout(function () { window.location.href = '/'; }, 3000);
            },
            error: function (jqXHR) {
                console.log(jqXHR.responseText + ' :: ' + jqXHR.statusText);
            }
        });
    });
})