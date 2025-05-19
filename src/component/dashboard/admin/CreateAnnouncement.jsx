import { useState, useRef, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold,
  Italic,
  Underline,
  AlignRight,
  Link,
  Upload,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import ThemeContext from "../../Context/ThemeContext";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import withReactContent from "sweetalert2-react-content";
import { useAddAnnouncementMutation } from "../../../redux/features/api/announcementApi";
import Header from "../shared/Header/Header";

const MySwal = withReactContent(Swal);

export default function CreateAnnouncement() {
  const { isDarkMode } = useContext(ThemeContext);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [startDate, setStartDate] = useState();
  const [endDate, setEndDate] = useState();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const linkInputRef = useRef(null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isRTL, setIsRTL] = useState(false);

  const [addAnnouncement, { isLoading: isPublishing }] = useAddAnnouncementMutation();

  // Theme classes
  const bgMain = isDarkMode ? "bg-gray-900" : "bg-gray-50";
  const cardBg = isDarkMode ? "" : "bg-white";
  const textColor = isDarkMode ? "text-white" : "text-gray-900";
  const borderColor = isDarkMode ? "border-gray-700" : "border-gray-200";
  const inputBg = isDarkMode ? "bg-gray-700" : "bg-white";
  const toolbarBg = isDarkMode ? "bg-gray-700" : "bg-gray-100";
  const activeButtonBg = isDarkMode ? "bg-gray-600" : "bg-gray-300";

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTargetAudience("all");
    setSelectedGroups([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setFiles([]);
    setPreviews([]);
    setLinkUrl("");
    setShowLinkInput(false);
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    setIsRTL(false);

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      editorRef.current.style.direction = "ltr";
      editorRef.current.style.textAlign = "left";
      editorRef.current.style.unicodeBidi = "normal";
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.direction = isRTL ? "rtl" : "ltr";
      editorRef.current.style.textAlign = isRTL ? "right" : "left";
      editorRef.current.style.unicodeBidi = isRTL ? "embed" : "normal";

      if (editorRef.current.innerHTML === "") {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(!isRTL);
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
  }, [isRTL]);

  // Generate previews for image files
  const generatePreviews = (files) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const newPreviews = [];

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push({
          url: e.target.result,
          name: file.name,
          size: file.size,
          type: file.type,
        });

        if (newPreviews.length === imageFiles.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });

    if (imageFiles.length === 0) {
      setPreviews([]);
    }
  };

  useEffect(() => {
    generatePreviews(files);
  }, [files]);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const supportedFiles = droppedFiles.filter((file) => {
        const fileType = file.type.toLowerCase();
        return (
          fileType.includes("image") ||
          fileType.includes("pdf") ||
          fileType.includes("mp4") ||
          fileType.includes("webm")
        );
      });
      setFiles((prev) => [...prev, ...supportedFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const supportedFiles = selectedFiles.filter((file) => {
        const fileType = file.type.toLowerCase();
        return (
          fileType.includes("image") ||
          fileType.includes("pdf") ||
          fileType.includes("mp4") ||
          fileType.includes("webm")
        );
      });
      setFiles((prev) => [...prev, ...supportedFiles]);
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...files];
    const removedFile = newFiles.splice(index, 1)[0];
    setFiles(newFiles);

    if (removedFile.type.startsWith("image/")) {
      setPreviews((prev) => prev.filter((p) => p.name !== removedFile.name));
    }
  };

  const handleBrowseFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const toggleStyle = (style) => {
    if (style === "rtl") {
      const newRTLState = !isRTL;
      setIsRTL(newRTLState);

      setTimeout(() => {
        if (editorRef.current) {
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(editorRef.current);
          range.collapse(!newRTLState);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          editorRef.current.focus();
        }
      }, 0);
      return;
    }

    document.execCommand(style, false, null);

    switch (style) {
      case "bold":
        setIsBold(!isBold);
        break;
      case "italic":
        setIsItalic(!isItalic);
        break;
      case "underline":
        setIsUnderline(!isUnderline);
        break;
      default:
        break;
    }

    updateContent();
  };

  const handleAddLink = () => {
    if (showLinkInput) {
      if (linkUrl) {
        document.execCommand("createLink", false, linkUrl);
        setLinkUrl("");
      }
      setShowLinkInput(false);
    } else {
      setShowLinkInput(true);
      setTimeout(() => {
        if (linkInputRef.current) {
          linkInputRef.current.focus();
        }
      }, 0);
    }
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const generateDocx = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: 28,
                }),
              ],
              bidirectional: isRTL,
              alignment: isRTL ? "right" : "left",
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "",
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    "Target Audience: " +
                    (targetAudience === "all"
                      ? "All Users"
                      : Array.isArray(selectedGroups)
                      ? selectedGroups.join(", ")
                      : String(selectedGroups)),
                }),
              ],
              bidirectional: isRTL,
              alignment: isRTL ? "right" : "left",
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    "Display Period: " +
                    (startDate ? format(startDate, "yyyy/MM/dd") : "N/A") +
                    " - " +
                    (endDate ? format(endDate, "yyyy/MM/dd") : "N/A"),
                }),
              ],
              bidirectional: isRTL,
              alignment: isRTL ? "right" : "left",
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "",
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: editorRef.current ? editorRef.current.innerText : "",
                }),
              ],
              bidirectional: isRTL,
              alignment: isRTL ? "right" : "left",
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, `${title || "Announcement"}.docx`);
  };

  const handlePublish = async () => {
    // Validate required fields
    if (!title || !content || !startDate || !endDate) {
      await MySwal.fire({
        title: "Missing Information",
        text: "Please fill in all required fields",
        icon: "error",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    if (targetAudience === "specific" && selectedGroups.length === 0) {
      await MySwal.fire({
        title: "Groups Required",
        text: "Please select at least one group when targeting specific audiences",
        icon: "error",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    try {
      const toastId = toast.loading("Publishing announcement...");

      // Separate image files and non-image files
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      const otherFiles = files.filter((file) => !file.type.startsWith("image/"));

      // ImgBB API URL
      const imageHostingApi = `https://api.imgbb.com/1/upload?key=${
        import.meta.env.VITE_IMAGE_HOSTING_KEY
      }`;
      const uploadedImageUrls = [];

      // Upload images to ImgBB
      for (const file of imageFiles) {
        if (!file.type.startsWith("image/")) {
          throw new Error("File is not an image");
        }

        const formDataImage = new FormData();
        formDataImage.append("image", file);

        const res = await fetch(imageHostingApi, {
          method: "POST",
          body: formDataImage,
        });

        const data = await res.json();

        if (data.success) {
          uploadedImageUrls.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: data.data.display_url,
          });
        } else {
          console.error("ImgBB upload error:", data);
          throw new Error("Failed to upload image to ImgBB");
        }
      }

      // Prepare metadata for non-image files
      const otherFilesMetadata = otherFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }));

      // Combine uploaded images and other files metadata
      const allFiles = [...uploadedImageUrls, ...otherFilesMetadata];

      // Prepare announcement data
      const announcementData = {
        title,
        content,
        targetAudience,
        selectedGroups: targetAudience === "specific" ? selectedGroups : [],
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        files: allFiles,
        createdAt: new Date().toISOString(),
      };

      // Send POST request using RTK Query mutation
      await addAnnouncement(announcementData).unwrap();

      // Generate DOCX file
      await generateDocx();

      toast.success("Announcement published successfully!", {
        id: toastId,
        duration: 4000,
      });

      resetForm();

      await MySwal.fire({
        title: "Success!",
        text: "Your announcement has been published and the DOCX file has been generated.",
        icon: "success",
        confirmButtonColor: "#3b82f6",
      });
    } catch (error) {
      console.error("Error publishing announcement:", error);
      toast.error("Failed to publish announcement", {
        duration: 4000,
      });
      if (error.message.includes("ImgBB")) {
        await MySwal.fire({
          icon: "warning",
          title: "Image Upload Failed",
          text: "Failed to upload images to ImgBB. Please try again.",
          confirmButtonColor: "#3b82f6",
        });
      } else {
        await MySwal.fire({
          title: "Error",
          text: "Something went wrong while publishing your announcement",
          icon: "error",
          confirmButtonColor: "#3b82f6",
        });
      }
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 ${bgMain} ${textColor}`}>
      <div className={`max-w-6xl mx-auto p-6 rounded-lg ${cardBg}`}>
        <Header
          header={"Create New Announcement"}
          title={"Easily create and publish announcements to your target audience."}
        />
        <div className="space-y-6">
          <div>
            <Label
              htmlFor="title"
              className={`block text-sm font-medium mb-1 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Announcement Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title"
              className={`w-full ${inputBg} ${borderColor} ${textColor}`}
              required
            />
          </div>

          <div>
            <Label
              htmlFor="content"
              className={`block text-sm font-medium mb-1 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Announcement Content <span className="text-red-500">*</span>
            </Label>
            <div className={`border ${borderColor} rounded-md overflow-hidden`}>
              <div className={`${toolbarBg} p-2 border-b ${borderColor} flex gap-2`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0", isBold && activeButtonBg)}
                  onClick={() => toggleStyle("bold")}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0", isItalic && activeButtonBg)}
                  onClick={() => toggleStyle("italic")}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0", isUnderline && activeButtonBg)}
                  onClick={() => toggleStyle("underline")}
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0", isRTL && activeButtonBg)}
                  onClick={() => toggleStyle("rtl")}
                >
                  <AlignRight className="h-4 w-4" />
                  <span className="sr-only">RTL</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0", showLinkInput && activeButtonBg)}
                  onClick={handleAddLink}
                >
                  <Link className="h-4 w-4" />
                  <span className="sr-only">Add Link</span>
                </Button>
              </div>

              {showLinkInput && (
                <div className={`p-2 ${toolbarBg} border-b ${borderColor}`}>
                  <Input
                    ref={linkInputRef}
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Enter URL"
                    className={`w-full ${inputBg} ${borderColor} ${textColor}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddLink();
                      }
                    }}
                  />
                </div>
              )}

              <div
                ref={editorRef}
                contentEditable
                className={`min-h-[150px] p-3 focus:outline-none ${inputBg} ${textColor}`}
                onInput={updateContent}
                onKeyDown={(e) => {
                  if (isRTL) {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.preventDefault();
                      const selection = window.getSelection();
                      if (selection?.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        if (e.key === "ArrowLeft") {
                          range.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
                        } else {
                          range.setStart(
                            range.startContainer,
                            Math.min(range.startContainer.length, range.startOffset + 1)
                          );
                        }
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                      }
                    }
                  }
                }}
                style={{
                  direction: isRTL ? "rtl" : "ltr",
                  textAlign: isRTL ? "right" : "left",
                  unicodeBidi: isRTL ? "embed" : "normal",
                }}
              />
            </div>
          </div>

          <div>
            <Label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Target Audience <span className="text-red-500">*</span>
            </Label>
            <RadioGroup value={targetAudience} onValueChange={setTargetAudience} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-users" />
                <Label htmlFor="all-users" className={textColor}>All Users</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific-groups" />
                <Label htmlFor="specific-groups" className={textColor}>Specific Groups</Label>
              </div>
            </RadioGroup>

            {targetAudience === "specific" && (
              <div className="mt-2">
                <Select multiple value={selectedGroups} onValueChange={(values) => setSelectedGroups(values)}>
                  <SelectTrigger className={`w-full ${inputBg} ${borderColor} ${textColor}`}>
                    <SelectValue placeholder="Select groups" />
                  </SelectTrigger>
                  <SelectContent className={`${cardBg} ${borderColor} ${textColor}`}>
                    <SelectItem value="admin">Administrators</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                  </SelectContent>
                </Select>
                {targetAudience === "specific" && selectedGroups.length === 0 && (
                  <p className="text-red-500 text-xs mt-1">Please select at least one group</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                Display Start Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      `w-full justify-start text-left font-normal ${inputBg} ${borderColor} ${textColor}`,
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "yyyy/MM/dd") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={`w-auto p-0 ${cardBg} ${borderColor}`}>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={`${cardBg} ${textColor}`}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                Display End Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      `w-full justify-start text-left font-normal ${inputBg} ${borderColor} ${textColor}`,
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "yyyy/MM/dd") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={`w-auto p-0 ${cardBg} ${borderColor}`}>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={`${cardBg} ${textColor}`}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Media Upload
            </Label>
            <div className={`border-2 border-dashed ${borderColor} rounded-lg p-8 text-center`} onDrop={handleDrop} onDragOver={handleDragOver}>
              <Upload className="h-10 w-10 mx-auto text-gray-500" />
              <p className={`mt-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                Drag and drop files here or click to upload
              </p>
              <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"} mt-1`}>
                Supported formats: JPG, PNG, MP4, PDF, WebM
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,video/*,application/pdf"
              />
              <Button
                type="button"
                variant="outline"
                className={`mt-4 ${
                  isDarkMode ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                } ${textColor}`}
                onClick={handleBrowseFiles}
              >
                Browse Files
              </Button>
            </div>

            {previews.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"} mb-2`}>
                  Image Previews:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className={`relative border ${borderColor} rounded-md overflow-hidden group`}>
                      <img src={preview.url} alt={preview.name} className="w-full h-40 object-cover" />
                      <div className={`p-2 ${isDarkMode ? "bg-gray-800" : "bg-gray-50"}`}>
                        <p className={`text-xs truncate ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {preview.name}
                        </p>
                        <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {(preview.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(files.findIndex((f) => f.name === preview.name))}
                        className={`absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
                        }`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"} mb-2`}>
                  Selected Files:
                </h4>
                <ul className="space-y-1">
                  {files.map((file, index) => {
                    if (file.type.startsWith("image/")) return null;
                    return (
                      <li key={index} className={`flex justify-between items-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                        <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className={`p-1 rounded-full ${isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              variant="outline"
              type="button"
              className={`${
                isDarkMode ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : "bg-white border-gray-300 hover:bg-gray-50"
              } ${textColor}`}
              onClick={resetForm}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}