import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TimelineEvent } from '../types';

interface HistoryChartProps {
  data: TimelineEvent[];
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Resize observer to make D3 responsive
  useEffect(() => {
    if (!wrapperRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width);
      }
    });
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current || width === 0) return;

    // Sort data
    const sortedData = [...data].sort((a, b) => a.year - b.year);
    
    const marginTop = 40;
    const marginBottom = 40;
    const marginLeft = 60;
    const marginRight = 20;
    const itemHeight = 100; // Height per item
    const height = sortedData.length * itemHeight + marginTop + marginBottom;
    const innerWidth = width - marginLeft - marginRight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${marginLeft},${marginTop})`);

    // Draw vertical line
    g.append("line")
      .attr("x1", 20)
      .attr("y1", 0)
      .attr("x2", 20)
      .attr("y2", height - marginBottom - marginTop)
      .attr("stroke", "#475569") // Slate-600
      .attr("stroke-width", 2);

    // Color scale for categories
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['founding', 'product', 'acquisition', 'scandal', 'general'])
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#94a3b8']);

    const nodes = g.selectAll(".node")
      .data(sortedData)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d, i) => `translate(20, ${i * itemHeight})`);

    // Event Dot
    nodes.append("circle")
      .attr("r", 8)
      .attr("fill", (d) => colorScale(d.category) as string)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 3);

    // Year Label (Left)
    nodes.append("text")
      .attr("x", -15)
      .attr("y", 5)
      .attr("text-anchor", "end")
      .text(d => d.year)
      .attr("fill", "#cbd5e1")
      .attr("font-weight", "bold")
      .attr("font-size", "14px");

    // Content Card (Right)
    const cardGroup = nodes.append("g")
      .attr("transform", "translate(20, -20)");

    // Card Background
    cardGroup.append("rect")
      .attr("width", Math.max(200, innerWidth - 60))
      .attr("height", 80)
      .attr("rx", 8)
      .attr("fill", "#1e293b") // Slate-800
      .attr("stroke", "#334155")
      .attr("stroke-width", 1)
      .attr("class", "transition-colors hover:stroke-blue-500 cursor-pointer");

    // Title
    cardGroup.append("text")
      .attr("x", 15)
      .attr("y", 25)
      .text(d => d.title)
      .attr("fill", "#f8fafc")
      .attr("font-weight", "600")
      .attr("font-size", "16px")
      .each(function(d) {
        // Simple text wrapping or truncation could go here if needed, keeping it simple for now
        const self = d3.select(this);
        let textLength = self.node()?.getComputedTextLength() || 0;
        const maxLen = innerWidth - 100;
        if (textLength > maxLen) {
           self.text(d.title.substring(0, 40) + "...");
        }
      });

    // Description
    cardGroup.append("text")
      .attr("x", 15)
      .attr("y", 50)
      .text(d => d.description)
      .attr("fill", "#94a3b8")
      .attr("font-size", "12px")
      .each(function(d) {
         const self = d3.select(this);
         let textLength = self.node()?.getComputedTextLength() || 0;
         const maxLen = innerWidth - 90;
         if (textLength > maxLen) {
            self.text(d.description.substring(0, 80) + "...");
         }
      });
      
      // Date String
      cardGroup.append("text")
        .attr("x", Math.max(200, innerWidth - 60) - 10)
        .attr("y", 20)
        .attr("text-anchor", "end")
        .text(d => d.dateStr || d.year)
        .attr("fill", "#64748b")
        .attr("font-size", "10px");


  }, [data, width]);

  return (
    <div ref={wrapperRef} className="w-full h-full overflow-y-auto overflow-x-hidden p-4">
      <svg ref={svgRef} className="block mx-auto"></svg>
    </div>
  );
};

export default HistoryChart;
