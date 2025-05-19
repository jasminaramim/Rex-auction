import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const announcementApi = createApi({
  reducerPath: "announcementApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `https://rex-auction-server-side-jzyx.onrender.com`,
  }),
  tagTypes: ["Announcement"],
  endpoints: (builder) => ({
    getAnnouncements: builder.query({
      query: () => `/announcement`,
      providesTags: ["Announcement"],
    }),

    addAnnouncement: builder.mutation({
      query: (announcement) => ({
        url: "/announcement",
        method: "POST",
        body: announcement,
      }),
      invalidatesTags: ["Announcement"],
    }),

    updateAnnouncement: builder.mutation({
      query: ({ id, data }) => ({
        url: `/announcement/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Announcement"],
    }),

    deleteAnnouncement: builder.mutation({
      query: (id) => ({
        url: `/announcement/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Announcement"],
    }),
  }),
});

export const {
  useGetAnnouncementsQuery,
  useAddAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
} = announcementApi;

export default announcementApi;
