/*
Creates an interactive Heat Map 
	input - objConfig with the following properties:
		divElement - d3 selection of div in which to creat chart
		dataArr - data to be charted. an array of arrays
			the first sub-array is for name of columns - with first element being blank
			in subsequent sub-arrays, the first element is name of row
		title - Title for the chart
		topN - number of names to show - even if data contains more than topN values
		format - options - int, float, percent, , float3, float4	
*/
function HeatMap(configObj){
	const seqColors = ['#ffffd9','#edf8b1','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#253494','#081d58'];
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
		//scaleColor = d3.scaleQuantile().range(seqColors),
		scaleColor = d3.scaleQuantize().range(seqColors),
		parentResizeFunction,
		marginPercent = {top:0.00, right:0.10, bottom:0.125, left:0.1};
		
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
					case 'float3':
						format = d3.format(".3f");
						break;	
					case 'float4':
						format = d3.format(".4f");
						break;	
				}
			}
	
	divElement.style('font-family', 'Helvetica').style("cursor", "default");
	
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
	
	function isTooDark(col){
		let isTooDark = false;
		let rgbColor = d3.rgb(col);
		// HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
		let hsp = Math.sqrt(
						0.299 * (rgbColor.r * rgbColor.r) +
						0.587 * (rgbColor.g * rgbColor.g) +
						0.114 * (rgbColor.b * rgbColor.b)
						);
				
				
		if (hsp<127.5) {
			isTooDark = true;
		}
		return isTooDark;
	}
	
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
		if(hSvg > wSvg){
			hSvg = wSvg;
		}
		scaleX.range([marginPercent.left*wSvg, wSvg*(1 -  marginPercent.right)]);
		scaleY.range([marginPercent.top*hSvg, hSvg*(1 - marginPercent.bottom)]);
		createChart();
	}
	
	function understandData(){
		let allVals = [];
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
						allVals.push(cc);
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
		allVals.sort();
		scaleX.domain([0, allColumns.length]);
		scaleY.domain([0, allRows.length]);
		scaleColor.domain(d3.extent(allVals)).nice();
	}
	
	function mouseEnter(d){
		svgElem.selectAll(".row_g").style("opacity", 0.1);
		svgElem.selectAll(".col_g").style("opacity", 0.1);
		svgElem.selectAll("text.text_label").style("display", "none");
		
		if(d.row){
			svgElem.selectAll(".row_g").each(function(dIn){
				if(dIn.row === d.row){
					d3.select(this).style("opacity", 1);
				}
			});
			svgElem.selectAll("text.text_label").each(function(dIn){
				if(dIn.row === d.row){
					d3.select(this).style("display", null);
				}
			});
			if(d.name){
				svgElem.selectAll(".col_g.name_g").style("opacity", 1);
			}
		}
		if(d.col){
			svgElem.selectAll(".col_g").each(function(dIn){
				if(dIn.col === d.col){
					d3.select(this).style("opacity", 1);
				}
			});
			svgElem.selectAll("text.text_label").each(function(dIn){
				if(dIn.col === d.col){
					d3.select(this).style("display", null);
				}
			});
			if(d.name){
				svgElem.selectAll(".row_g.name_g").style("opacity", 1);
			}
		}
		
		if(isMobile && mouseTimer){
			clearTimeout(mouseTimer);
		}
		if(isMobile){
			mouseTimer = setTimeout(mouseLeave, 2000);
		}
	}
	
	function mouseLeave(d){
		svgElem.selectAll(".row_g").style("opacity", 1);
		svgElem.selectAll(".col_g").style("opacity", 1);
		svgElem.selectAll("text.text_label").style("display", "none");
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
									.datum({"row":rr, "name":rr})
									.attr("class", "row_g name_g")
									.on("mouseenter", mouseEnter)
									.on("mouseleave", mouseLeave);
									
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
									.datum({"col":cc, "name":rr})
									.attr("class", "col_g name_g")
									.on("mouseenter", mouseEnter)
									.on("mouseleave", mouseLeave);
					
					let coordX = rectWidth/2 - (rectWidth*0.2),
						coordY = rectHeight * 0.6;
					
					colNameG.append("text")
							.attr("x", coordX)
							.attr("y", coordY)
							.attr("dominant-baseline", "hanging")
							.attr("text-anchor", "end")
							.style("font-size", fontSize)
							.attr("transform", "rotate(-30, " + coordX + "," + coordY + ")")
							.text(allColumns[ci]);					
				}
				let rectColor = scaleColor(keyValueObj[rr + "-" + cc]),
					fontColor = "black";
					
				let rectG = g.append("g")
								.attr("transform", "translate(" + scaleX(ci) + "," + scaleY(ri) + ")")
								.datum({"row":rr, "col":cc, "color":rectColor})
								.attr("class", "col_g row_g color_g")
								.on("mouseenter", mouseEnter)
								.on("mouseleave", mouseLeave);
				
					
				if(isTooDark(rectColor)){
					fontColor = "white";
				}
					    
				rectG.append("rect")
						.attr("width", rectWidth * 0.95)
						.attr("height", rectHeight * 0.95)
						.attr("rx", rectWidth * 0.05)
						.style("fill", rectColor);
						
				rectG.append("text")
						.attr("x", rectWidth * 0.475)
						.attr("y", rectHeight * 0.475)
						.attr("dominant-baseline", "central")
						.attr("text-anchor", "middle")
						.style("font-size", fontSize*0.7)
						.style("fill", fontColor)
						.style("display", "none")
						.datum({"row":rr, "col":cc, "color":rectColor})
						.attr("class", "text_label")
						.text(format(keyValueObj[rr + "-" + cc]));
			});
		});
		
		// prepage legend
		let legendG = svgElem.append("g")
								.attr("transform", "translate(" + wSvg*(1 - (marginPercent.right * 0.8)) + "," + hSvg*marginPercent.top + ")");
		let legendRectWidth = marginPercent.right * 0.15 * wSvg;						
		seqColors.forEach(function(cc, ci, arr){
			let legendPartG = legendG.append("g")
										.attr("transform", "translate(0, " + (legendRectWidth * (arr.length - ci)) + ")")
										.datum({"color":cc})
										.attr("class", "legend_g")
										.on("mouseenter", mouseEnter)
										.on("mouseleave", mouseLeave);
										
			legendPartG.append("rect")
						.attr("width", legendRectWidth*0.9)
						.attr("height", legendRectWidth*0.9)
						.attr("rx", legendRectWidth*0.05)
						.style("fill", cc);
			
			let extent = scaleColor.invertExtent(cc);
			legendPartG.append("text")
						.attr("x", legendRectWidth)
						.attr("y", legendRectWidth*0.45)
						.attr("dominant-baseline", "central")
						.style("font-size", fontSize*0.7)
						.text(format(extent[0]) + " - " + format(extent[1]));
		});					
	}
	understandData();
	resize();
}