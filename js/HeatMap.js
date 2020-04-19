/*
Creates an interactive Heat Map 
	input - objConfig with the following properties:
		divElement - d3 selection of div in which to creat chart
		dataArr - data to be charted. an array of arrays
			the first sub-array is for name of columns - with first element being blank
			in subsequent sub-arrays, the first element is name of row
		title - Title for the chart
		topN - number of names to show - even if data contains more than topN values
		format - options - int, float, percent	
*/
function HeatMap(configObj){
	let resizeTimer,
		mouseTimer,
		wSvg,
		hSvg,
		svgElem,
		isMobile = false,
		maxVal = Number.NEGATIVE_INFINITY,
		minVal = Number.POSITIVE_INFINITY,
		allRows = [],
		allColumns = [],
		allRowKeys = [], // for each row key like r0, r1, ...
		allColKeys = [], // for each col key like c0, c1, ...
		keyValueObj = {}, // double key like r0-c0, r0-c1 ... for stories corelation values
		scaleX = d3.scaleLinear(),
		scaleY = d3.scaleLinear(),
		parentResizeFunction,
		marginPercent = {top:0.01, right:0.05, bottom:0.20, left:0.15};
		
	if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		isMobile = true;
	}
	
	let divElement = configObj.divElement, // required 
			dataArr = configObj.dataArr, // required 
			title = 'Heat Map Chart',
			barColor = d3.schemeCategory10[0],
			format;
			
			if(configObj.title){
				title = configObj.title;
			}
			if(configObj.barColor){
				barColor = configObj.barColor;
			}
			if(configObj.format){
				switch(configObj.format){
					case 'int':
						format = d3.format(",d");
						break;
					case 'float':
						format = d3.format(".2f");
						break;
					case 'percent':
						format = d3.format(".2%");
						break;
				}
			}
	
	divElement.style('font-family', 'Helvetica');
	
	// check if there is already a resize function
	if(d3.select(window).on('resize')){
		parentResizeFunction = d3.select(window).on('resize');
	}
	
	d3.select(window).on('resize', function(){
		if(resizeTimer){
			clearTimeout(resizeTimer);
		}
		resizeTimer = setTimeout(resize, 100);
		if(parentResizeFunction){
			parentResizeFunction();
		}
	});
	
	function resize(){
		// remove previous chart, if any
		divElement.selectAll("*").remove();
		let w = divElement.node().clientWidth,
			h = divElement.node().clientHeight,
			titleFontSize = h/25;
		
		if(titleFontSize > 32){
			titleFontSize = 32;
		}
		// append title
		let titleElement = divElement.append("h2").style("font-size", titleFontSize).text(title);
		
		// calculate width and height of svg
		wSvg = w;
		hSvg = h - titleElement.node().scrollHeight;

		if(wSvg < 100){
			wSvg = 100;
		}
		if(hSvg < 100){
			hSvg = 100;
		}
		scaleX.range([marginPercent.left*wSvg, wSvg*(1 -  marginPercent.right)]);
		scaleY.range([marginPercent.top*hSvg, hSvg*(1 - marginPercent.bottom)]);
		createChart();
	}
	
	function understandData(){
		dataArr.forEach(function(rr, ri){
			if(ri === 0){
				rr.forEach(function(cc, ci){
					if(ci === 0) return; // this is expected to be blank
					allColumns.push(cc);
					allColKeys.push("c"+ci);
				});
			}else{
				rr.forEach(function(cc, ci){
					if(ci === 0){
						allRows.push(cc);
						allRowKeys.push("r"+ri);
					}else{
						keyValueObj["r"+ri+"-c"+ci] = cc;
						if(cc > maxVal){
							maxVal = cc;
						}
						if(cc < minVal){
							minVal = cc;
						}
					}
				});
			}
		});
		scaleX.domain([0, allColumns.length]);
		scaleY.domain([0, allRows.length]);
	}
	
	function namesMouseOver(d){
		return;
		if(isMobile && mouseTimer){
			clearTimeout(mouseTimer);
		}
		svgElem.selectAll("g.viz_g").each(function(dIn){
			if(dIn.name === d.name){
				d3.select(this).style("opacity", 1).style("font-weight","bold");
			}else{
				d3.select(this).style("opacity", 0.1).style("font-weight","normal");
			}
		});
		if(isMobile){
			mouseTimer = setTimeout(namesMouseOut, 2000);
		}
	}
	
	function namesMouseOut(d){
		return;
		svgElem.selectAll("g.viz_g").style("opacity", 0.8).style("font-weight","normal");
	}
	
	function createChart(){
		let rectHeight = (hSvg*(1 - (marginPercent.top + marginPercent.bottom)))/allRows.length,
			rectWidth = (wSvg*(1 - (marginPercent.left + marginPercent.right)))/allColumns.length,
			fontSize = hSvg/(1.5 * allRows.length);
		
		if(fontSize > 24){
			fontSize = 24;
		}
		if(fontSize < 6){
			fontSize = 6;
		}
		
		svgElem = divElement.append("svg").attr("width", wSvg).attr("height", hSvg);
		
		let g = svgElem.append("g");
		
		allRowKeys.forEach(function(rr, ri){
			allColKeys.forEach(function(cc, ci){
				if(ci === 0){
					let rowNameG = g.append("g")
									.attr("transform", "translate(" + scaleX(ci) + "," + scaleY(ri) + ")")
									.datum({"row":rr});
									
					rowNameG.append("text")
							.attr("x", - 5)
							.attr("y", rectHeight/2)
							.attr("dominant-baseline", "central")
							.attr("text-anchor", "end")
							.style("font-size", fontSize)
							.text(allRows[ri]);
				}
				if(ri === allRows.length - 1){
					let colNameG = g.append("g")
									.attr("transform", "translate(" + scaleX(ci) + "," + scaleY(ri + 1) + ")")
									.datum({"col":cc});
					
					colNameG.append("text")
							.attr("x", rectWidth/2 - (rectWidth*0.2))
							.attr("y", rectHeight*1.4)
							//.attr("dominant-baseline", "hanging")
							.attr("text-anchor", "end")
							.style("font-size", fontSize)
							.attr("transform", "rotate(-45)")
							.text(allColumns[ci]);					
				}
			});
		});
							
	}
	understandData();
	resize();
}