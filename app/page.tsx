"use client";

import GithubIcon from "@/components/icons/github-icon";
import XIcon from "@/components/icons/x-icon";
import Logo from "@/components/logo";
import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import imagePlaceholder from "@/public/image-placeholder.png";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

type ImageResponse = {
  b64_json: string;
  timings: { inference: number };
  seed?: number;
};

type Generation = {
  prompt: string;
  image: ImageResponse;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [iterativeMode, setIterativeMode] = useState(false);
  const [userAPIKey, setUserAPIKey] = useState("");
  const [steps, setSteps] = useState(3);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const debouncedPrompt = useDebounce(prompt, 300);
  const [generations, setGenerations] = useState<Generation[]>([]);
  let [activeIndex, setActiveIndex] = useState<number | undefined>();

  const { data: image, isFetching, refetch } = useQuery({
    placeholderData: (previousData) => previousData,
    queryKey: [debouncedPrompt, replayCount],
    queryFn: async () => {
      let res = await fetch("/api/generateImages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt, 
          userAPIKey, 
          iterativeMode, 
          steps,
          replayCount 
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      return (await res.json()) as ImageResponse;
    },
    enabled: !!debouncedPrompt.trim(),
    staleTime: Infinity,
    retry: false,
  });

  let isDebouncing = prompt !== debouncedPrompt;

  useEffect(() => {
    if (image && !generations.map((g) => g.image).includes(image)) {
      setGenerations((prevGenerations) => {
        const newGenerations = [...prevGenerations, { prompt, image }];
        setActiveIndex(newGenerations.length - 1);
        return newGenerations;
      });
    }
  }, [generations, image, prompt]);

  const handleReplay = async () => {
    if (!iterativeMode || !prompt) return;
    
    setIsReplaying(true);
    setReplayCount(prev => prev + 1);
    await refetch();
    setIsReplaying(false);
  };

  const handleDownload = (imageData: string, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = `blinkshot-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  let activeImage = activeIndex !== undefined && activeIndex >= 0 && activeIndex < generations.length
    ? generations[activeIndex].image
    : undefined;

  return (
    <div className="flex h-full flex-col px-5">
      <header className="flex justify-center pt-20 md:justify-end md:pt-3">
      </header>

      <div className="flex justify-center">
        <form className="mt-10 w-full max-w-lg">
          <fieldset>
            <div className="relative">
              <Textarea
                rows={4}
                spellCheck={false}
                placeholder="Describe your image..."
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full resize-none border-gray-300 border-opacity-50 bg-gray-400 px-4 text-base placeholder-gray-300"
              />
              <div
                className={`${isFetching || isDebouncing ? "flex" : "hidden"} absolute bottom-3 right-3 items-center justify-center`}
              >
                <Spinner className="size-4" />
              </div>
            </div>

            <div className="mt-3 text-sm md:text-right flex items-center justify-end gap-6">
              <label className="inline-flex items-center gap-2">
                Steps (2-5)
                <Input
                  type="number"
                  min={2}
                  max={5}
                  value={steps}
                  onChange={(e) => setSteps(Math.min(5, Math.max(2, parseInt(e.target.value) || 2)))}
                  className="w-16 bg-gray-400 text-gray-200 placeholder:text-gray-300"
                />
              </label>
              <label
                title="Use earlier images as references"
                className="inline-flex items-center gap-2"
              >
                Consistency mode
                <Switch
                  checked={iterativeMode}
                  onCheckedChange={(checked) => {
                    setIterativeMode(checked);
                    if (!checked) {
                      setReplayCount(0);
                    }
                  }}
                />
              </label>
              {iterativeMode && prompt && (
                <Button
                  onClick={handleReplay}
                  disabled={isReplaying}
                  className="bg-white hover:bg-gray-100 text-gray-800"
                  size="sm"
                  title="Generate another consistent version"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isReplaying ? 'animate-spin' : ''}`} />
                  Regenerate ({replayCount})
                </Button>
              )}
            </div>
          </fieldset>
        </form>
      </div>

      <div className="flex w-full grow flex-col items-center justify-center pb-8 pt-4 text-center">
        {!activeImage || !prompt ? (
          <div className="max-w-xl md:max-w-4xl lg:max-w-3xl">
            <p className="text-xl font-semibold text-gray-200 md:text-3xl lg:text-4xl">
              Generate images in real-time
            </p>
            <p className="mt-4 text-balance text-sm text-gray-300 md:text-base lg:text-lg">
              Enter a prompt and generate images in milliseconds as you type.
              Powered by Flux on Together AI.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex w-full max-w-4xl flex-col justify-center">
            <div>
              <div className="relative">
                <Image
                  placeholder="blur"
                  blurDataURL={imagePlaceholder.blurDataURL}
                  width={1024}
                  height={768}
                  src={`data:image/png;base64,${activeImage?.b64_json || ''}`}
                  alt=""
                  className={`${isFetching ? "animate-pulse" : ""} max-w-full rounded-lg object-cover shadow-sm shadow-black`}
                />
                {activeImage && (
                  <>
                    <Button
                      onClick={() => handleDownload(activeImage.b64_json, activeIndex || 0)}
                      className="absolute bottom-4 right-4 bg-white hover:bg-gray-100 text-gray-800 shadow-lg"
                      size="icon"
                      title="Download Image"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                    {iterativeMode && activeImage.seed !== undefined && (
                      <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                        Seed: {activeImage.seed}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-4 overflow-x-scroll pb-4">
              {generations.map((generatedImage, i) => (
                <button
                  key={i}
                  className={`w-32 shrink-0 transition-opacity ${i === activeIndex ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                  onClick={() => setActiveIndex(i)}
                >
                  <div className="relative">
                    <Image
                      placeholder="blur"
                      blurDataURL={imagePlaceholder.blurDataURL}
                      width={1024}
                      height={768}
                      src={`data:image/png;base64,${generatedImage.image.b64_json}`}
                      alt=""
                      className="max-w-full rounded-lg object-cover shadow-sm shadow-black"
                    />
                    {iterativeMode && generatedImage.image.seed !== undefined && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white px-2 py-0.5 rounded-full text-xs">
                        #{i + 1} • {generatedImage.image.seed}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      
    </div>
  );
}
