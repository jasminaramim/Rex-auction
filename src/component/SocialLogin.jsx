import { useNavigate } from "react-router-dom";
import google from "../assets/Untitled_design__19_-removebg-preview.png";
import { useDispatch } from "react-redux";
import {
  setUser,
  toggleLoading,
  setErrorMessage,
} from "../redux/features/user/userSlice";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { useAddUserMutation } from "../redux/features/api/userApi";

const SocialLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { signInWithGoogle } = useAuth();
  const [addUser] = useAddUserMutation();

  const handleGoogleLogin = () => {
    dispatch(toggleLoading(true));
    signInWithGoogle()
      .then((result) => {
        const user = result.user;

        // Update Redux store with user data
        dispatch(
          setUser({
            uid: user?.uid,
            name: user?.displayName,
            email: user?.email,
            photoURL: user?.photoURL,
            role: "buyer",
            AuctionsWon: 0,
            ActiveBids: 0,
            TotalSpent: 0,
            accountBalance: 0,
            BiddingHistory: 0,
            onGoingBid: 0,
          })
        );

        toast.success("Login successful");

        // User data to be saved
        const userData = {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
          photo: user?.photoURL,
          role: "buyer",
          AuctionsWon: 0,
          ActiveBids: 0,
          TotalSpent: 0,
          accountBalance: 0,
          BiddingHistory: [],
          onGoingBid: 0,
          location: "",
          memberSince: new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
          recentActivity: [],
          watchingNow: [],
          transactions: [],
        };

        // Save user data to the backend using the addUser API
        addUser(userData)
          .then(() => {
            navigate("/");
          })
          .catch((error) => {
            dispatch(setErrorMessage(error.message));
            toast.error("Failed to save user data");
          });
      })
      .catch((error) => {
        dispatch(setErrorMessage(error.message));
        toast.error("Login Unsuccessful");
      })
      .finally(() => {
        dispatch(toggleLoading(false));
      });
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleGoogleLogin}
        className="w-full py-3 flex items-center justify-center border-2 border-gray-500 text-purple-500 font-semibold rounded-lg shadow-md hover:bg-gradient-to-r from-blue-800 to-purple-900 hover:text-white transition-all"
      >
        <img src={google} alt="Google logo" className="w-8 h-8 mr-2" />
        Continue with Google
      </button>
    </div>
  );
};

export default SocialLogin;
