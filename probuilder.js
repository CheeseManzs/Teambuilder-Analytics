function loadScript(scriptName) {
    var scriptEl = document.createElement('script');
    scriptEl.src = chrome.extension.getURL(scriptName + '.js');
    document.head.appendChild(scriptEl);
    return scriptEl;
}
const fetch = window.fetch.bind(window);

var data = {};
var in_loop = false;
const gens = new generations.Generations(dex.Dex);
const smgn = new smogon.Smogon(fetch);

async function getData(mon, battleFormat)
{
    if(Object.keys(data).includes(mon+battleFormat))
    {
        return data[mon+battleFormat];
    }
    else
    {
        var tries = 10;
        var smogon_data = await smgn.stats(gens.get(Number(battleFormat[3])), mon, battleFormat);
        while(smogon_data == null && tries > 0)
        {
            tries--;
            smogon_data = await smgn.stats(gens.get(Number(battleFormat[3])), mon, battleFormat);
        }
        console.log("new data for " + mon + " in " + battleFormat,smogon_data);
        data[mon+battleFormat] = smogon_data;
        return smogon_data;
    }
}

async function urlExists(gcpUrl)
{
    try
    {
        let getOptions = {
            method: "get",
            headers: {
                'Accept': 'application/text',
            }
        }
        
        const getResults = await fetch(gcpUrl, getOptions);
        if(getResults.status == 404)
        {
            return false;
        }
        else
        {
            return true;
        }
    }
    catch
    {
        return true;
    }
}

async function detectDOMChanges()
{
    var oldDOM = "";
    var newDOM = oldDOM;
    while(true)
    {
        
        var domEle = document.getElementById("room-teambuilder");
        if(domEle != null)
        {
            newDOM = domEle.innerHTML;
            if(newDOM != null && newDOM != oldDOM)
            {
                oldDOM = newDOM;
                onUrlChange(location.href);
            }
        }
        await new Promise(r => setTimeout(r, 100));
    }
}

var lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if( url !== lastUrl)
    {
        lastUrl = url;
        onUrlChange(url);

    }
}).observe(document, {subtree: true, childList: true});

async function onUrlChange(url)
{
    var currentUrl = url;
    teamBuilder();
}

function tallyInDictionary(dict, key, incrementBy)
{
    if(Object.keys(dict).includes(key))
    {
        dict[key].value += incrementBy;
        dict[key].sampleSize++;
    }
    else
    {
        dict[key] = {value: incrementBy, sampleSize: 1};
    }
}

function createBasicLabel(labelText)
{
    var l = document.createElement('label');
    l.innerHTML += labelText;
    return l;
}

function createTextbox(innerText, width="100%")
{
    var l = document.createElement('p');
    l.innerHTML += innerText;
    l.setAttribute('class','textbox');
    l.setAttribute('style','width:'+width+";")
    return l;
}

function addTeambuilderColumn(chartElement, internalName, labelText)
{
    var pxWidth = 1234;
    var newCol = document.createElement('div');
    newCol.setAttribute('style','width: '+(pxWidth*0.22)+'px; overflow-y: hidden; overflow-x: hidden; padding-left: 0.2%; padding-right: 0.2%; scrollbar-width: none;');
    newCol.setAttribute('class','setcol '+('setcol-'+internalName));
    var newDiv = document.createElement('div');
    newDiv.setAttribute('class', 'setcell');
    newDiv.setAttribute('style', 'width: 95%');
    
    var colLabel = document.createElement('label');
    colLabel.setAttribute('class',internalName+"-label")
    colLabel.innerHTML += labelText;
    

    newDiv.appendChild(colLabel);
    newCol.appendChild(newDiv);
    chartElement.appendChild(newCol);
    
    if(!chartElement.getAttribute('style').endsWith('width:'+pxWidth+'px;'))
    {
        chartElement.setAttribute('style',chartElement.getAttribute('style')+'width:'+pxWidth+'px;');
    }
    
    return newDiv;
}

async function teamBuilder()
{
    
    //var sEl = loadScript('bundle');
    await new Promise(r => setTimeout(r, 200));
    const chartElements = document.getElementsByClassName("setchart");
    var formatElement = document.getElementsByClassName("teambuilderformatselect")[0];
    if(formatElement == null){return;}
    var battleFormat = formatElement.getAttribute('value');
    var roomElement = document.getElementById("room-teambuilder");
    var roomViewer = document.getElementById("room-rooms");


    try{document.querySelector('button.closebutton[value="view-hellodex"]').click();}catch{}
    try{document.querySelector('button.button[name="closeHide"]').click();}catch{}
    try{document.querySelector('button.button[name="close"]').click();}catch{}
    //if(roomViewer != null){roomViewer.setAttribute('style', roomViewer.getAttribute('style') + "display: none;");}
    //if(roomElement != null){roomElement.setAttribute('style', roomElement.getAttribute('style') + 'width: 100%;');}
    
    var teamAnalysis = [];
    var teamMemebers = [];
    var counterAnalysis = {};
    var switchAnalysis = {};
    var koAnalysis = {}; 
    var recAnalysis = {};
    await new Promise(r => setTimeout(r, 100));
    for(var i = 0; i < chartElements.length; i++)
    {
        var chart = chartElements[i];
        var nameElement = null;
        while(nameElement == null)
        {
            try
            {
                nameElement = chart.getElementsByClassName("setcell-pokemon")[0].getElementsByClassName("textbox")[0].getAttribute('value');
        
            }
            catch
            {

            }
            await new Promise(r => setTimeout(r, 10));
        }
        var ana = await getData(nameElement, battleFormat);
        teamAnalysis.push(ana);
        teamMemebers.push(nameElement);
    }
    console.log("team:",teamMemebers);
    var totalProtected = 0;
    var totalThreats = 0;
    for(var i = 0; i < chartElements.length; i++)
    {
        var chart = chartElements[i];
        
        var nameElement = chart.getElementsByClassName("setcell-pokemon")[0].getElementsByClassName("textbox")[0].getAttribute('value');
        var analysisCol;

        
        if(chart.getElementsByClassName('setcol-counters').length == 0)
        {
            var protected = 0;
            var antiCounters = [];
            if(teamAnalysis[i] == null){continue;}
            var counters = teamAnalysis[i].counters;
            if(counters == null){continue;}
            var elem = addTeambuilderColumn(chart, "counters","Outstanding Counters");
            var listElem = document.createElement('div');
            listElem.setAttribute('style','overflow-y: scroll; height: 116px; scrollbar-width: none; width: 100%;');
            var counterKeys = Object.keys(counters);
            var totalCounters = 0;
            for(var c = 0; c < Math.min(counterKeys.length, 20); c++)
            {
                var counterName = counterKeys[c];
                

                var counterData = await getData(counterName, battleFormat);
                
                if(counterData == null){continue;}
                var teamHasAnticounter = false;
                if(counterData.counters != null && Object.keys(counterData.counters).length > 0)
                {
                    totalCounters++;
                    var anticounters = Object.keys(counterData.counters);
                    console.log("counter data for " + counterName,anticounters);
                    for(var t = 0; t< teamMemebers.length; t++)
                    {
                        if(anticounters.includes(teamMemebers[t]))
                        {
                            teamHasAnticounter = true;
                            break;
                        }
                    }
                    if(!teamHasAnticounter)
                    {
                        antiCounters = antiCounters.concat(anticounters);
                    }
                }
                else
                {
                    continue;
                }
                totalThreats++;
                if(teamHasAnticounter){protected++; totalProtected++; continue;}
                var counter = counters[counterKeys[c]];
                var counterElement = document.createElement('p');
                tallyInDictionary(counterAnalysis,counterName,(counter[1] + counter[2])/teamMemebers.length);
                tallyInDictionary(switchAnalysis,counterName,(counter[2]));
                tallyInDictionary(koAnalysis,counterName,(counter[1]));
                counterElement.setAttribute('class', 'textbox');
                counterElement.setAttribute('style', 'width:95%;');
                counterElement.innerHTML = counterKeys[c] + ": " + (((counter[1] + counter[2])*100).toFixed(0)) + "%";
                listElem.appendChild(counterElement);

            }
            
            if(totalCounters > 0)
            {
                elem.getElementsByClassName("counters-label")[0].innerHTML += " (" + (100*protected/totalCounters).toFixed(0) + "% Protected)";
            }
            if(protected == totalCounters)
            {
                var perfectLabel = createBasicLabel("None!");
                var labelContainer = document.createElement('div');
                labelContainer.setAttribute('style','display: table; text-align:center; justify-content: center; vertical-align: middle; horizontal-align:middle;width:100%;height:116px;')
                perfectLabel.setAttribute('style','font-size:12px; display: table-cell; align-items: center; vertical-align:middle; position:relative;');
                labelContainer.appendChild(perfectLabel);
                elem.appendChild(labelContainer);
            }
            else
            {
                elem.appendChild(listElem);
            }
            antiCounters = [...new Set(antiCounters)];
            var AC_elem = addTeambuilderColumn(chart, "anticounters","Possible Anti-Counters");
            var AC_listElem = document.createElement('div');
            AC_listElem.setAttribute('style','overflow-y: scroll; height: 116px; scrollbar-width: none; width: 100%;');
            for(var c = 0; c < Math.min(antiCounters.length, 20); c++)
            {
                var anticounter = antiCounters[c];
                var counterElement = document.createElement('p');
                counterElement.setAttribute('class', 'textbox');
                counterElement.setAttribute('style', 'width:95%;');
                counterElement.innerHTML = anticounter;
                AC_listElem.appendChild(counterElement);
            }
            
            if(antiCounters.length == 0)
            {
                var perfectLabel = createBasicLabel("N/A");
                var labelContainer = document.createElement('div');
                labelContainer.setAttribute('style','display: table; text-align:center; justify-content: center; vertical-align: middle; horizontal-align:middle;width:100%;height:116px;')
                perfectLabel.setAttribute('style','font-size:12px; display: table-cell; align-items: center; vertical-align:middle; position:relative;');
                labelContainer.appendChild(perfectLabel);
                AC_elem.appendChild(labelContainer);
            }
            else
            {
                AC_elem.appendChild(AC_listElem);
            }
            
        }
        else
        {
            analysisCol = chart.getElementsByClassName('setcol-analysis');
        }
        
        
    }
    
    if(document.getElementsByClassName('analysis-chart').length == 0)
    {
        var counters = Object.keys(counterAnalysis);
        var synergy = 100*totalProtected/totalThreats;
        for(var c = 0; c < counters.length; c++)
        {
            var counter = counters[c];
            var counterData = await getData(counter, battleFormat);
            if(counterData == null || counterData.counters == null){continue;}
            var anticounters = counterData.counters;
            var anticounterNames = Object.keys(anticounters);
            for(var a = 0; a < anticounterNames.length; a++)
            {
                var acn = anticounterNames[a];
                var acData = anticounters[acn];
                var recScore = counterData.usage.weighted*(acData[1] + acData[2]);
                tallyInDictionary(recAnalysis,acn,recScore);
            }
        }
        var recs = Object.keys(recAnalysis);
        recs.sort((a, b) => {return recAnalysis[b].value - recAnalysis[a].value;})
        console.log(recAnalysis);
        console.log(recs);

        var tsLabel = document.createElement('label');
        tsLabel.setAttribute('style','font-size: 20px');

        var synColor = "#C30000";
        
        if(synergy > 20)
        {
            synColor = "#FF5733";
        }
        if(synergy > 40)
        {
            synColor = "#9B870C";
        }
        if(synergy >= 60)
        {
            synColor = "#008000";
        }
        if(synergy >= 90)
        {
            synColor = "#008B8B";
        }
        tsLabel.innerHTML += "Defensive Synergy: <font color="+synColor+">" + synergy.toFixed(0) + "%</font>";

        var cLabel = createBasicLabel("Counters Protected Against");
        var cData = createTextbox(totalProtected, "50px");
        var uLabel = createBasicLabel("Counters Unaccounted For");
        var uData = createTextbox(totalThreats - totalProtected, "50px");
        

        var teamchartElement = document.getElementsByClassName("teamchart")[0];
        var newChart = document.createElement('li');
        newChart.setAttribute('class','analysis-chart');
        newChart.setAttribute('value',6);
        var newChartDiv = document.createElement('div');
        newChartDiv.setAttribute('class','setchart');
        var boxHeight = 270;
       
        var majorCounterNum = 0;
        for(var m = 0; m < counters.length; m++)
        {
            if(counterAnalysis[counters[m]].value >= 0.3)
            {
                majorCounterNum++;
            }
        }

        var worstMatchup = Object.keys(counterAnalysis).reduce((a, b) => counterAnalysis[a].value > counterAnalysis[b].value ? a : b); 
        var matchupTitle = document.createElement('label');
        matchupTitle.innerHTML += "Major Counters: " + majorCounterNum;
        matchupTitle.setAttribute('style','font-size: 12px');

        var recTitle = createBasicLabel("Synergistic Team Members");
        recTitle.setAttribute('style','font-size: 12px');
        
        
        newChartDiv.appendChild(tsLabel);
        newChartDiv.appendChild(document.createElement('hr'));
        
        newChartDiv.appendChild(cLabel);
        newChartDiv.appendChild(cData);

        newChartDiv.appendChild(uLabel);
        newChartDiv.appendChild(uData);

        if(recs.length > 0)
        {        
            newChartDiv.appendChild(document.createElement('hr'));
            newChartDiv.appendChild(recTitle);
            newChartDiv.appendChild(document.createElement('hr'));
            
            for(var r = 0; r < Math.min(5, recs.length); r++)
            {
                var currentRec = recs[r];
                var recBox = createTextbox(currentRec+" (" + (100*recAnalysis[currentRec].value).toFixed(0) + "%)", "200px");
                newChartDiv.appendChild(recBox);
                boxHeight += 30;
            }
        }

        newChartDiv.appendChild(document.createElement('hr'));
        newChartDiv.appendChild(matchupTitle);
        
        for(var c = 0; c < counters.length; c++)
        {
            var counter = counters[c];
            if(counterAnalysis[counter].value >= 0.3)
            {
                
                var muLabel = document.createElement('label');
                muLabel.innerHTML += "Pokémon";
                var muName = document.createElement('p');
                muName.setAttribute('class','textbox');
                muName.innerHTML += counter;
                muName.setAttribute('style','width:212px');

                var anaLabel = document.createElement('label');
                anaLabel.innerHTML += "Team-Specific Analytics";

                var infoContainer = document.createElement('span');
                infoContainer.setAttribute('class','textbox setdetails');

                var infoCell = document.createElement('span');
                infoCell.setAttribute('class','detailcell detailcell-first');

                

                var muInfoLabel = document.createElement('label');
                muInfoLabel.innerHTML += "Avg. Switch Rate";

                infoCell.appendChild(muInfoLabel);
                infoCell.innerHTML += (switchAnalysis[counter].value*100/switchAnalysis[counter].sampleSize).toFixed(0)+ "%";
                
                var infoCell2 = document.createElement('span');
                infoCell2.setAttribute('class','detailcell');
                

                var muInfoLabel2 = document.createElement('label');
                muInfoLabel2.innerHTML += "Avg. KO Rate";
                infoCell2.appendChild(muInfoLabel2);
                infoCell2.innerHTML += (koAnalysis[counter].value*100/koAnalysis[counter].sampleSize).toFixed(0)+ "%";

                

                newChartDiv.appendChild(document.createElement('hr'));
                newChartDiv.appendChild(muLabel);
                newChartDiv.appendChild(muName);

                infoContainer.setAttribute('style','width:165px');
                infoContainer.appendChild(infoCell);
                infoContainer.appendChild(infoCell2);
                
                newChartDiv.appendChild(anaLabel);
                newChartDiv.appendChild(infoContainer);

                boxHeight += 140;

                if((await getData(counter,battleFormat)) == null){continue;}
                var anticounters = (await getData(counter,battleFormat)).counters;
                if(anticounters == null){continue;}
                var acNames = Object.keys(anticounters);
                
                var anticounterLabel = document.createElement('label');
                anticounterLabel.innerHTML += "Anti-Counters";
                newChartDiv.appendChild(anticounterLabel);
                for(var a = 0; a < acNames.length; a++)
                {
                    var acBox = document.createElement('p');
                    acBox.setAttribute('class','textbox');
                    acBox.setAttribute('style','width:200px');
                    acBox.innerHTML += acNames[a] + " (" + ((anticounters[acNames[a]][1] + anticounters[acNames[a]][2])*100).toFixed(0) + "%)";
                    newChartDiv.appendChild(acBox);
                    boxHeight += 30;
                }

            }
            
        }


        newChart.appendChild(newChartDiv);
        teamchartElement.appendChild(newChart);
        newChartDiv.setAttribute('style',"background-position:10px 5px;background-repeat:no-repeat;width:1234px;height:"+boxHeight+"px;");
        
    }
    
}

onUrlChange(location.href);
detectDOMChanges();