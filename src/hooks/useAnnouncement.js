import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const useAnnouncement = () => {
  const {
    refetch,
    data: announcements = [],
    isLoading,
  } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await axios.get(
        `https://rex-auction-server-side-jzyx.onrender.com/announcement`
      );

      return res.data;
    },
  });

  return [announcements, refetch, isLoading];
};

export default useAnnouncement;
