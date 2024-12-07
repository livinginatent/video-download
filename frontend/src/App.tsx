import { useState } from "react";
import "./App.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { MoonLoader } from "react-spinners";
import { Moon } from "lucide-react";
function App() {
  const [link, setLink] = useState("");
  const [format, setFormat] = useState("mp4");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (event) => {
    setLink(event.target.value);
    setError("");
  };
  const handleFormatChange = (event) => {
    setFormat(event.target.value);
  };
  const handleDownload = () => {
    if (link.includes("youtube.com") || link.includes("youtu.be")) {
      setLoading(true);
      fetch(
        `http://localhost:5000/api/download?url=${encodeURIComponent(
          link
        )}&format=${format}`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to download video");
          }

          // Extract filename from Content-Disposition header
          const disposition = response.headers.get("Content-Disposition");
          let filename = `video.${format}`; // Default filename

          if (disposition && disposition.includes("filename=")) {
            const filenameMatch = disposition.match(
              /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
            );
            if (filenameMatch != null && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/['"]/g, "");
            }
          }

          return response.blob().then((blob) => ({ blob, filename }));
        })
        .then(({ blob, filename }) => {
          // Create a URL for the blob and trigger a download
          const url = window.URL.createObjectURL(blob);
          const linkElement = document.createElement("a");
          linkElement.href = url;
          linkElement.download = filename;
          document.body.appendChild(linkElement);
          linkElement.click();
          document.body.removeChild(linkElement);
        })
        .catch((error) => {
          console.error("Error during download:", error);
          setError("Videonu yükləmək mümkün olmadı.");
        })
        .finally(() => setLoading(false));
    } else {
      setError("Xahiş olunur, düzgün bir YouTube linki daxil edin.");
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-6 h-full">
        <h1 className="text-neutral-50">YouTube Video Yüklə</h1>
        <h2 className="text-neutral-50">
          İstədiyiniz videonu MP4 və ya MP3 formatında yükləyin
        </h2>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            placeholder="Videonun linkini daxil edin"
            value={link}
            onChange={handleInputChange}
          />
          <select
            value={format}
            onChange={handleFormatChange}
            className="border bg-[#0B192C] px-2 h-full border-none rounded text-neutral-50"
          >
            <option value="mp4" className="text-neutral-50 ">
              MP4
            </option>
            <option value="mp3" className=" text-neutral-50 ">
              MP3
            </option>
          </select>

          <Button
            className="border-0 bg-[#0B192C] text-md"
            type="button"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? "Yüklənir..." : "Yüklə"}
          </Button>
        </div>
        {loading && <MoonLoader color="#E6E9AF" />}
        {error && <p className="text-[#3D0301] text-lg font-bold">{error}</p>}
      </div>
    </>
  );
}

export default App;
