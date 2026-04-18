import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Copy, Check, Info, Settings, Code, FileText, ChevronRight } from "lucide-react";
import { parsePrintf, formatPrintf, PrintfToken } from "@/lib/printf";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const DEFAULT_FORMAT = "Hello %s, process %d finished in %.2fms. Flags: %b";
const DEFAULT_ARGS = ["Admin", "1337", "42.05", "101"];

export default function Home() {
  const [formatString, setFormatString] = useState(DEFAULT_FORMAT);
  const [args, setArgs] = useState<string[]>(DEFAULT_ARGS);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const tokens = useMemo(() => parsePrintf(formatString), [formatString]);
  
  const specifierTokens = useMemo(() => tokens.filter(t => t.type === 'specifier' && t.specifier !== '%'), [tokens]);
  
  // Auto-pad args array if new specifiers are added
  useEffect(() => {
    if (specifierTokens.length > args.length) {
      setArgs(prev => {
        const next = [...prev];
        while (next.length < specifierTokens.length) {
          next.push("");
        }
        return next;
      });
    }
  }, [specifierTokens.length, args.length]);

  const renderedOutput = useMemo(() => {
    try {
      return formatPrintf(tokens, args);
    } catch (e) {
      return `Error formatting: ${e}`;
    }
  }, [tokens, args]);

  const handleArgChange = (index: number, value: string) => {
    setArgs(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(renderedOutput);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Rendered output has been copied.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded border border-primary/20">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">printf<span className="text-foreground opacity-50">_formatter</span></h1>
            <p className="text-xs text-muted-foreground font-mono">live evaluation environment</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="font-mono text-xs hidden sm:flex border-border bg-card">
            v1.0.0
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: Input & Args */}
        <div className="flex-1 flex flex-col border-r border-border overflow-y-auto">
          <div className="p-6 space-y-8 max-w-4xl w-full mx-auto">
            
            {/* Format String Input */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Code className="w-4 h-4 text-primary" />
                  Format String
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground font-mono">&gt;</span>
                </div>
                <Input 
                  value={formatString}
                  onChange={(e) => setFormatString(e.target.value)}
                  className="font-mono text-base pl-8 py-6 bg-card border-border focus-visible:ring-primary focus-visible:border-primary transition-all duration-200 rounded-none border-b-2 focus-visible:border-b-primary shadow-sm"
                  placeholder="Enter format string (e.g. Hello %s)"
                  spellCheck={false}
                />
              </div>
            </section>

            {/* Arguments */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Settings className="w-4 h-4 text-primary" />
                  Arguments
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full border border-primary/20">
                    {specifierTokens.length} detected
                  </span>
                </label>
              </div>

              <div className="bg-card border border-border p-4 rounded-sm min-h-[200px]">
                {specifierTokens.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-50 py-8">
                    <Info className="w-8 h-8" />
                    <p className="text-sm font-mono">No specifiers found in format string</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {specifierTokens.map((token, idx) => (
                        <motion.div
                          key={`arg-${idx}`}
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: "auto", y: 0 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-stretch gap-3 group"
                        >
                          <div className="flex flex-col items-center justify-center w-12 bg-muted border border-border rounded-sm">
                            <span className="text-xs font-mono text-muted-foreground">arg{idx}</span>
                            <span className="font-mono font-bold text-primary">{token.match}</span>
                          </div>
                          <Input
                            value={args[idx] ?? ""}
                            onChange={(e) => handleArgChange(idx, e.target.value)}
                            className="font-mono bg-background border-border flex-1 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary rounded-sm"
                            placeholder={`Value for ${token.match}`}
                            spellCheck={false}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>

        {/* Right Column: Output & Cheat Sheet */}
        <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col bg-card/30">
          
          {/* Live Output */}
          <div className="flex-1 flex flex-col border-b border-border">
            <div className="px-4 py-3 border-b border-border bg-card flex justify-between items-center">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Live Output
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyToClipboard}
                className="h-8 hover:bg-primary/20 hover:text-primary transition-colors"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                <span className="font-mono text-xs uppercase tracking-wider">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
            
            <div className="flex-1 p-4 bg-black/40 relative overflow-hidden group">
              {/* Scanlines / CRT effect subtle overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10"></div>
              
              <pre className="font-mono text-[15px] leading-relaxed whitespace-pre-wrap break-all text-foreground h-full overflow-y-auto">
                {renderedOutput || <span className="opacity-30 italic">{"<empty output>"}</span>}
              </pre>
            </div>
          </div>

          {/* Cheat Sheet */}
          <div className="flex-1 overflow-y-auto bg-card p-4">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4 flex items-center gap-2">
              <Info className="w-3 h-3" />
              Specifier Reference
            </h3>
            
            <div className="space-y-4">
              <ReferenceSection title="Basic Types" items={[
                { s: "%s", desc: "String" },
                { s: "%d / %i", desc: "Integer (base 10)" },
                { s: "%f", desc: "Float" },
                { s: "%c", desc: "Character" },
                { s: "%%", desc: "Literal %" },
              ]} />
              
              <ReferenceSection title="Advanced Numbers" items={[
                { s: "%x / %X", desc: "Hexadecimal (lower/upper)" },
                { s: "%o", desc: "Octal" },
                { s: "%b", desc: "Binary" },
                { s: "%e / %E", desc: "Scientific notation" },
                { s: "%g / %G", desc: "Shortest float rep." },
                { s: "%u", desc: "Unsigned integer" },
              ]} />

              <ReferenceSection title="Modifiers" items={[
                { s: "%10s", desc: "Pad left to 10 chars" },
                { s: "%-10s", desc: "Pad right to 10 chars" },
                { s: "%05d", desc: "Zero-pad to 5 chars" },
                { s: "%.2f", desc: "2 decimal places" },
                { s: "%+d", desc: "Always show sign" },
                { s: "% #x", desc: "Alternate form (e.g. 0x)" },
              ]} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function ReferenceSection({ title, items }: { title: string, items: { s: string, desc: string }[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-primary/80">{title}</h4>
      <div className="grid grid-cols-1 gap-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm group">
            <code className="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded text-xs transition-colors group-hover:bg-primary/20">{item.s}</code>
            <span className="text-muted-foreground text-xs">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
